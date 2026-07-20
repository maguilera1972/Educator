const fs = require('fs');

function resolveVideoMime(material, filePath) {
  return resolveStreamMime(material, filePath, 'video/mp4');
}

function resolveStreamMime(material, filePath, fallback = 'application/octet-stream') {
  if (material.mime_type) {
    return material.mime_type;
  }
  const ext = filePath.split('.').pop()?.toLowerCase();
  const map = {
    mp4: 'video/mp4',
    webm: 'video/webm',
    ogg: 'video/ogg',
    ogv: 'video/ogg',
    mov: 'video/quicktime',
    m4v: 'video/mp4',
    mkv: 'video/x-matroska',
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };
  return map[ext] || fallback;
}

const INLINE_VIEW_TYPES = new Set(['slides', 'videos']);

function isPdfMaterial(material) {
  const mime = (material.mime_type || '').toLowerCase();
  const name = (
    material.original_filename
    || material.title
    || material.file_path
    || ''
  ).toLowerCase();
  return mime === 'application/pdf' || name.endsWith('.pdf');
}

function canStreamMaterial(material) {
  if (!material?.file_path) return false;
  if (material.type === 'videos' || material.type === 'slides') return true;
  if (material.type === 'docs') return isPdfMaterial(material);
  return false;
}

function streamFile(req, res, filePath, mimeType, { allowDownload = false } = {}) {
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  const headers = {
    'Content-Type': mimeType,
    'Accept-Ranges': 'bytes',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Content-Disposition': allowDownload ? 'attachment' : 'inline',
  };

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) {
      res.writeHead(416, { 'Content-Range': `bytes */${fileSize}` });
      return res.end();
    }

    let start = match[1] ? parseInt(match[1], 10) : 0;
    let end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= fileSize) {
      res.writeHead(416, { 'Content-Range': `bytes */${fileSize}` });
      return res.end();
    }

    end = Math.min(end, fileSize - 1);
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      ...headers,
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Content-Length': chunkSize,
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
    return;
  }

  res.writeHead(200, {
    ...headers,
    'Content-Length': fileSize,
  });
  fs.createReadStream(filePath).pipe(res);
}

module.exports = {
  streamFile,
  resolveVideoMime,
  resolveStreamMime,
  INLINE_VIEW_TYPES,
  isPdfMaterial,
  canStreamMaterial,
};
