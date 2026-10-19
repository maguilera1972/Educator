const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { UPLOADS_ROOT, ensureDir, safeFilename, courseTypeDir } = require('./uploads');

// Sous la limite Cloudflare (~100 Mo) et assez petit pour éviter les timeouts tunnel
const CHUNK_MAX_BYTES = 8 * 1024 * 1024;
const UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;

function chunkRoot(userId, uploadId) {
  const safeUser = String(userId || '0').replace(/[^0-9]/g, '') || '0';
  const safeId = String(uploadId || '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeId || safeId.length < 8 || safeId.length > 80) {
    throw new Error('Invalid upload id');
  }
  return path.join(UPLOADS_ROOT, 'tmp', 'chunks', safeUser, safeId);
}

function metaPath(dir) {
  return path.join(dir, 'meta.json');
}

function partPath(dir, index) {
  return path.join(dir, `${Number(index)}.part`);
}

function readMeta(dir) {
  const file = metaPath(dir);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function writeMeta(dir, meta) {
  ensureDir(dir);
  fs.writeFileSync(metaPath(dir), JSON.stringify(meta, null, 2));
}

function initChunkUpload(userId, payload) {
  const uploadId = crypto.randomBytes(16).toString('hex');
  const dir = chunkRoot(userId, uploadId);
  ensureDir(dir);

  const meta = {
    upload_id: uploadId,
    user_id: Number(userId),
    course_id: Number(payload.courseId),
    type: payload.type,
    section_id: payload.sectionId || null,
    title: payload.title || '',
    description: payload.description || '',
    original_filename: payload.originalFilename || 'file',
    mime_type: payload.mimeType || 'application/octet-stream',
    file_size: Number(payload.fileSize) || 0,
    total_chunks: Number(payload.totalChunks) || 0,
    received: [],
    created_at: Date.now(),
  };

  if (!meta.total_chunks || meta.total_chunks < 1 || meta.total_chunks > 100000) {
    throw new Error('Invalid chunk count');
  }
  if (!meta.file_size || meta.file_size < 1) {
    throw new Error('Invalid file size');
  }

  writeMeta(dir, meta);
  return meta;
}

function saveChunk(userId, uploadId, chunkIndex, tempFilePath) {
  const dir = chunkRoot(userId, uploadId);
  const meta = readMeta(dir);
  if (!meta) throw new Error('Upload session not found or expired');
  if (Number(meta.user_id) !== Number(userId)) throw new Error('Upload not allowed');

  const index = Number(chunkIndex);
  if (!Number.isInteger(index) || index < 0 || index >= meta.total_chunks) {
    throw new Error('Invalid chunk index');
  }

  const dest = partPath(dir, index);
  fs.renameSync(tempFilePath, dest);

  if (!meta.received.includes(index)) {
    meta.received.push(index);
    meta.received.sort((a, b) => a - b);
    writeMeta(dir, meta);
  }

  return {
    upload_id: uploadId,
    chunk_index: index,
    received: meta.received.length,
    total_chunks: meta.total_chunks,
  };
}

function cleanupUpload(userId, uploadId) {
  const dir = chunkRoot(userId, uploadId);
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    fs.unlinkSync(path.join(dir, name));
  }
  fs.rmdirSync(dir);
}

function assembleChunkUpload(userId, uploadId) {
  const dir = chunkRoot(userId, uploadId);
  const meta = readMeta(dir);
  if (!meta) throw new Error('Upload session not found or expired');
  if (Number(meta.user_id) !== Number(userId)) throw new Error('Upload not allowed');

  if (meta.received.length !== meta.total_chunks) {
    throw new Error(`Upload incomplet (${meta.received.length}/${meta.total_chunks} fragments)`);
  }

  for (let i = 0; i < meta.total_chunks; i++) {
    if (!fs.existsSync(partPath(dir, i))) {
      throw new Error(`Fragment manquant : ${i}`);
    }
  }

  const finalName = `${crypto.randomBytes(8).toString('hex')}-${safeFilename(meta.original_filename)}`;
  const finalDir = courseTypeDir(meta.course_id, meta.type);
  const finalPath = path.join(finalDir, finalName);
  const outFd = fs.openSync(finalPath, 'w');
  try {
    for (let i = 0; i < meta.total_chunks; i++) {
      const data = fs.readFileSync(partPath(dir, i));
      fs.writeSync(outFd, data);
    }
  } finally {
    fs.closeSync(outFd);
  }

  const stat = fs.statSync(finalPath);
  const result = {
    meta,
    file_path: finalPath,
    file_size: stat.size,
    original_filename: meta.original_filename,
    mime_type: meta.mime_type,
  };

  cleanupUpload(userId, uploadId);
  return result;
}

function cleanupStaleChunkUploads(maxAgeMs = UPLOAD_TTL_MS) {
  const root = path.join(UPLOADS_ROOT, 'tmp', 'chunks');
  if (!fs.existsSync(root)) return;
  const now = Date.now();
  for (const userDir of fs.readdirSync(root)) {
    const userPath = path.join(root, userDir);
    if (!fs.statSync(userPath).isDirectory()) continue;
    for (const uploadDir of fs.readdirSync(userPath)) {
      const full = path.join(userPath, uploadDir);
      if (!fs.statSync(full).isDirectory()) continue;
      const meta = readMeta(full);
      const age = now - (meta?.created_at || 0);
      if (!meta || age > maxAgeMs) {
        try {
          for (const name of fs.readdirSync(full)) fs.unlinkSync(path.join(full, name));
          fs.rmdirSync(full);
        } catch (_) {}
      }
    }
  }
}

module.exports = {
  CHUNK_MAX_BYTES,
  initChunkUpload,
  saveChunk,
  assembleChunkUpload,
  cleanupUpload,
  cleanupStaleChunkUploads,
  chunkRoot,
};
