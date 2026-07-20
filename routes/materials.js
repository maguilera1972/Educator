const express = require('express');
const fs = require('fs');
const path = require('path');
const { authRequired, authFromHeaderOrQuery, requireInstructorOrAdmin } = require('../middleware/auth');
const { canManageCourse, canAccessCourse } = require('./courses');
const { recordMaterialViewEvent } = require('../lib/access-analytics');
const { MATERIAL_TYPES, emptyStructure, groupMaterials, enrichMaterial } = require('../lib/materials');
const multer = require('multer');
const { upload, deleteStoredFile, formatBytes, UPLOADS_ROOT, ensureDir } = require('../lib/uploads');
const {
  CHUNK_MAX_BYTES,
  initChunkUpload,
  saveChunk,
  assembleChunkUpload,
  cleanupUpload,
  cleanupStaleChunkUploads,
} = require('../lib/chunked-upload');
const {
  streamFile,
  resolveVideoMime,
  resolveStreamMime,
  INLINE_VIEW_TYPES,
  canStreamMaterial,
} = require('../lib/streaming');

const chunkIncomingDir = path.join(UPLOADS_ROOT, 'tmp', 'incoming');
ensureDir(chunkIncomingDir);
const chunkUpload = multer({
  dest: chunkIncomingDir,
  limits: { fileSize: CHUNK_MAX_BYTES + (1024 * 1024) },
});

try {
  cleanupStaleChunkUploads();
} catch (_) {}

const MATERIAL_COLUMNS = 'id, type, section_id, title, description, url, file_path, original_filename, mime_type, file_size, order_index, created_at';

function resolveSectionId(db, courseId, type, sectionId) {
  if (!sectionId) return null;
  const parsed = parseInt(sectionId, 10);
  if (!parsed) return null;
  const section = db.prepare(
    'SELECT id, type FROM material_sections WHERE id = ? AND course_id = ?'
  ).get(parsed, courseId);
  if (!section) {
    throw new Error('Section introuvable');
  }
  if (section.type !== type) {
    throw new Error('La section ne correspond pas au type de matériel');
  }
  return section.id;
}

function enrichRows(rows, courseId) {
  return rows.map((row) => {
    const item = enrichMaterial(row, courseId);
    if (item.file_size) item.file_size_label = formatBytes(item.file_size);
    return item;
  });
}

function nextOrder(db, courseId, type) {
  const row = db.prepare(
    'SELECT COALESCE(MAX(order_index), -1) AS max_order FROM course_materials WHERE course_id = ? AND type = ?'
  ).get(courseId, type);
  return row.max_order + 1;
}

function insertMaterial(db, data) {
  try {
    const result = db.prepare(`
      INSERT INTO course_materials
        (course_id, type, section_id, title, description, url, file_path, original_filename, mime_type, file_size, order_index)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.courseId,
      data.type,
      data.section_id || null,
      data.title,
      data.description || '',
      data.url || '',
      data.file_path || '',
      data.original_filename || '',
      data.mime_type || '',
      data.file_size || 0,
      data.order_index
    );
    return db.prepare(`SELECT ${MATERIAL_COLUMNS} FROM course_materials WHERE id = ?`).get(result.lastInsertRowid);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      throw new Error('Section introuvable ou invalide pour ce type de matériel');
    }
    throw err;
  }
}

module.exports = function createMaterialsRouter(db) {
  const router = express.Router({ mergeParams: true });

  function assertCourseAccess(req, res) {
    const courseId = req.params.courseId;
    const course = db.prepare('SELECT id FROM courses WHERE id = ?').get(courseId);
    if (!course) {
      res.status(404).json({ error: 'Cours introuvable' });
      return false;
    }
    if (!canAccessCourse(db, req.user, courseId) && req.user.role === 'learner') {
      res.status(403).json({ error: 'Inscrivez-vous au cours pour accéder au matériel' });
      return false;
    }
    return true;
  }

  router.get('/', authRequired, (req, res) => {
    if (!assertCourseAccess(req, res)) return;

    const rows = db.prepare(
      `SELECT ${MATERIAL_COLUMNS} FROM course_materials WHERE course_id = ? ORDER BY type, order_index, id`
    ).all(req.params.courseId);

    const structure = groupMaterials(enrichRows(rows, req.params.courseId));
    res.json({ structure, types: MATERIAL_TYPES });
  });

  router.get('/structure', authRequired, (req, res) => {
    if (!assertCourseAccess(req, res)) return;
    res.json({ structure: emptyStructure(), types: MATERIAL_TYPES });
  });

  router.get('/:materialId/stream', authFromHeaderOrQuery, (req, res) => {
    if (!assertCourseAccess(req, res)) return;

    const material = db.prepare(
      `SELECT ${MATERIAL_COLUMNS} FROM course_materials WHERE id = ? AND course_id = ?`
    ).get(req.params.materialId, req.params.courseId);

    if (!material || !canStreamMaterial(material)) {
      return res.status(404).json({ error: 'Contenu introuvable' });
    }
    if (!material.file_path || !fs.existsSync(material.file_path)) {
      return res.status(404).json({ error: 'Fichier introuvable' });
    }

    const mimeType = material.type === 'videos'
      ? resolveVideoMime(material, material.file_path)
      : resolveStreamMime(material, material.file_path, 'application/pdf');
    streamFile(req, res, path.resolve(material.file_path), mimeType, { allowDownload: false });
  });

  router.post('/:materialId/stream-ticket', authRequired, (req, res) => {
    if (!assertCourseAccess(req, res)) return;

    const material = db.prepare(
      `SELECT ${MATERIAL_COLUMNS} FROM course_materials WHERE id = ? AND course_id = ?`
    ).get(req.params.materialId, req.params.courseId);

    if (!material || !canStreamMaterial(material)) {
      return res.status(404).json({ error: 'Contenu introuvable' });
    }
    if (!material.file_path || !fs.existsSync(material.file_path)) {
      return res.status(404).json({ error: 'Fichier introuvable' });
    }

    const { createStreamTicket } = require('../lib/stream-ticket');
    const ticket = createStreamTicket(req.user.id, req.params.courseId, material.id);
    res.json({
      ticket,
      url: `/api/courses/${req.params.courseId}/materials/${material.id}/stream?ticket=${encodeURIComponent(ticket)}`,
    });
  });

  router.get('/:materialId/file', authFromHeaderOrQuery, (req, res) => {
    if (!assertCourseAccess(req, res)) return;

    const material = db.prepare(
      `SELECT ${MATERIAL_COLUMNS} FROM course_materials WHERE id = ? AND course_id = ?`
    ).get(req.params.materialId, req.params.courseId);

    if (!material?.file_path || !fs.existsSync(material.file_path)) {
      return res.status(404).json({ error: 'Fichier introuvable' });
    }

    if (INLINE_VIEW_TYPES.has(material.type) && req.user.role === 'learner') {
      return res.status(403).json({ error: 'Consultez le contenu depuis le lecteur intégré' });
    }

    const filename = material.original_filename || path.basename(material.file_path);
    if (material.mime_type) res.setHeader('Content-Type', material.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.sendFile(path.resolve(material.file_path));
  });

  // Upload par fragments (contourne la limite ~100 Mo de Cloudflare)
  router.post('/upload-init', authRequired, requireInstructorOrAdmin(db), (req, res) => {
    const courseId = req.params.courseId;
    if (!canManageCourse(db, req.user, courseId)) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const {
      type,
      title,
      description,
      section_id,
      original_filename,
      mime_type,
      file_size,
      total_chunks,
    } = req.body || {};

    if (!MATERIAL_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Type invalide (slides, videos, docs, labs)' });
    }

    try {
      resolveSectionId(db, courseId, type, section_id);
      const meta = initChunkUpload(req.user.id, {
        courseId,
        type,
        sectionId: section_id || null,
        title: title || '',
        description: description || '',
        originalFilename: original_filename || title || 'file',
        mimeType: mime_type || 'application/octet-stream',
        fileSize: file_size,
        totalChunks: total_chunks,
      });
      res.status(201).json({
        upload_id: meta.upload_id,
        chunk_size: CHUNK_MAX_BYTES,
        total_chunks: meta.total_chunks,
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post(
    '/upload-chunk',
    authRequired,
    requireInstructorOrAdmin(db),
    chunkUpload.single('chunk'),
    (req, res) => {
      const courseId = req.params.courseId;
      const cleanupTemp = () => {
        if (req.file?.path) deleteStoredFile(req.file.path);
      };

      if (!canManageCourse(db, req.user, courseId)) {
        cleanupTemp();
        return res.status(403).json({ error: 'Accès non autorisé' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Fragment manquant' });
      }

      const uploadId = req.body?.upload_id;
      const chunkIndex = req.body?.chunk_index;

      try {
        const result = saveChunk(req.user.id, uploadId, chunkIndex, req.file.path);
        res.json(result);
      } catch (err) {
        cleanupTemp();
        res.status(400).json({ error: err.message });
      }
    }
  );

  router.post('/upload-complete', authRequired, requireInstructorOrAdmin(db), (req, res) => {
    const courseId = req.params.courseId;
    if (!canManageCourse(db, req.user, courseId)) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const uploadId = req.body?.upload_id;
    if (!uploadId) {
      return res.status(400).json({ error: 'upload_id requis' });
    }

    let assembled;
    try {
      assembled = assembleChunkUpload(req.user.id, uploadId);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    const { meta, file_path, file_size, original_filename, mime_type } = assembled;

    if (String(meta.course_id) !== String(courseId)) {
      deleteStoredFile(file_path);
      cleanupUpload(req.user.id, uploadId);
      return res.status(400).json({ error: 'Upload incompatible avec ce cours' });
    }

    let resolvedSectionId = null;
    try {
      resolvedSectionId = resolveSectionId(db, courseId, meta.type, meta.section_id);
    } catch (err) {
      deleteStoredFile(file_path);
      return res.status(400).json({ error: err.message });
    }

    const resolvedTitle = (meta.title || '').trim()
      || String(original_filename || '').replace(/\.[^.]+$/, '')
      || original_filename
      || 'Fichier';

    try {
      const material = insertMaterial(db, {
        courseId,
        type: meta.type,
        section_id: resolvedSectionId,
        title: resolvedTitle,
        description: meta.description || '',
        file_path,
        original_filename,
        mime_type,
        file_size,
        order_index: nextOrder(db, courseId, meta.type),
      });
      res.status(201).json({ material: enrichRows([material], courseId)[0] });
    } catch (err) {
      deleteStoredFile(file_path);
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/', authRequired, requireInstructorOrAdmin(db), (req, res, next) => {
    if (req.is('multipart/form-data')) {
      return upload.single('file')(req, res, next);
    }
    next();
  }, (req, res) => {
    const courseId = req.params.courseId;
    if (!canManageCourse(db, req.user, courseId)) {
      if (req.file) deleteStoredFile(req.file.path);
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const { type, title, description, url, section_id } = req.body;
    if (!MATERIAL_TYPES.includes(type)) {
      if (req.file) deleteStoredFile(req.file.path);
      return res.status(400).json({ error: 'Type invalide (slides, videos, docs, labs)' });
    }

    const resolvedTitle = title?.trim() || req.file?.originalname || '';
    if (!resolvedTitle) {
      if (req.file) deleteStoredFile(req.file.path);
      return res.status(400).json({ error: 'Le titre est requis' });
    }

    if (!req.file && !url?.trim()) {
      return res.status(400).json({ error: 'Fournissez un fichier ou une URL' });
    }

    let resolvedSectionId = null;
    try {
      resolvedSectionId = resolveSectionId(db, courseId, type, section_id);
    } catch (err) {
      if (req.file) deleteStoredFile(req.file.path);
      return res.status(400).json({ error: err.message });
    }

    const material = insertMaterial(db, {
      courseId,
      type,
      section_id: resolvedSectionId,
      title: resolvedTitle,
      description: description?.trim(),
      url: url?.trim(),
      file_path: req.file?.path,
      original_filename: req.file?.originalname,
      mime_type: req.file?.mimetype,
      file_size: req.file?.size,
      order_index: nextOrder(db, courseId, type),
    });

    res.status(201).json({ material: enrichRows([material], courseId)[0] });
  });

  router.post('/batch', authRequired, requireInstructorOrAdmin(db), upload.array('files'), (req, res) => {
    const courseId = req.params.courseId;
    if (!canManageCourse(db, req.user, courseId)) {
      for (const file of req.files || []) deleteStoredFile(file.path);
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const { type, description, section_id } = req.body;
    if (!MATERIAL_TYPES.includes(type)) {
      for (const file of req.files || []) deleteStoredFile(file.path);
      return res.status(400).json({ error: 'Type invalide (slides, videos, docs, labs)' });
    }

    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ error: 'Sélectionnez au moins un fichier' });
    }

    let batchSectionId = null;
    try {
      batchSectionId = resolveSectionId(db, courseId, type, section_id);
    } catch (err) {
      for (const file of req.files || []) deleteStoredFile(file.path);
      return res.status(400).json({ error: err.message });
    }

    let order = nextOrder(db, courseId, type);
    const created = [];

    for (const file of files) {
      const material = insertMaterial(db, {
        courseId,
        type,
        section_id: batchSectionId,
        title: file.originalname,
        description: description?.trim(),
        file_path: file.path,
        original_filename: file.originalname,
        mime_type: file.mimetype,
        file_size: file.size,
        order_index: order++,
      });
      created.push(enrichRows([material], courseId)[0]);
    }

    res.status(201).json({ materials: created, count: created.length });
  });

  router.put('/:materialId', authRequired, requireInstructorOrAdmin(db), (req, res) => {
    const { courseId, materialId } = req.params;
    if (!canManageCourse(db, req.user, courseId)) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const material = db.prepare(
      `SELECT ${MATERIAL_COLUMNS} FROM course_materials WHERE id = ? AND course_id = ?`
    ).get(materialId, courseId);

    if (!material) {
      return res.status(404).json({ error: 'Élément introuvable' });
    }

    const { title, description, url, order_index, section_id } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ error: 'Le titre est requis' });
    }

    let resolvedSectionId = material.section_id;
    if (section_id !== undefined) {
      try {
        resolvedSectionId = resolveSectionId(db, courseId, material.type, section_id);
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }
    }

    try {
      db.prepare(
        'UPDATE course_materials SET title = ?, description = ?, url = ?, order_index = ?, section_id = ? WHERE id = ?'
      ).run(
        title.trim(),
        description?.trim() || '',
        url?.trim() || '',
        order_index ?? material.order_index,
        resolvedSectionId,
        materialId
      );
    } catch (err) {
      if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
        return res.status(400).json({ error: 'Section introuvable ou invalide pour ce type de matériel' });
      }
      throw err;
    }

    const updated = db.prepare(`SELECT ${MATERIAL_COLUMNS} FROM course_materials WHERE id = ?`).get(materialId);
    res.json({ material: enrichRows([updated], courseId)[0] });
  });

  router.put('/:materialId/file', authRequired, requireInstructorOrAdmin(db), upload.single('file'), (req, res) => {
    const { courseId, materialId } = req.params;
    if (!canManageCourse(db, req.user, courseId)) {
      if (req.file) deleteStoredFile(req.file.path);
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Fichier requis' });
    }

    const material = db.prepare(
      `SELECT ${MATERIAL_COLUMNS} FROM course_materials WHERE id = ? AND course_id = ?`
    ).get(materialId, courseId);

    if (!material) {
      deleteStoredFile(req.file.path);
      return res.status(404).json({ error: 'Élément introuvable' });
    }

    deleteStoredFile(material.file_path);

    db.prepare(`
      UPDATE course_materials
      SET file_path = ?, original_filename = ?, mime_type = ?, file_size = ?, url = ''
      WHERE id = ?
    `).run(req.file.path, req.file.originalname, req.file.mimetype, req.file.size, materialId);

    const updated = db.prepare(`SELECT ${MATERIAL_COLUMNS} FROM course_materials WHERE id = ?`).get(materialId);
    res.json({ material: enrichRows([updated], courseId)[0] });
  });

  router.delete('/:materialId', authRequired, requireInstructorOrAdmin(db), (req, res) => {
    const { courseId, materialId } = req.params;
    if (!canManageCourse(db, req.user, courseId)) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const material = db.prepare(
      `SELECT file_path FROM course_materials WHERE id = ? AND course_id = ?`
    ).get(materialId, courseId);

    if (!material) {
      return res.status(404).json({ error: 'Élément introuvable' });
    }

    deleteStoredFile(material.file_path);
    db.prepare('DELETE FROM material_view_events WHERE material_id = ?').run(materialId);
    db.prepare('DELETE FROM material_views WHERE material_id = ?').run(materialId);
    db.prepare('DELETE FROM course_materials WHERE id = ?').run(materialId);
    res.json({ ok: true });
  });

  router.post('/:materialId/viewed', authRequired, (req, res) => {
    const { courseId, materialId } = req.params;
    if (!assertCourseAccess(req, res)) return;

    const material = db.prepare(
      `SELECT id, type FROM course_materials WHERE id = ? AND course_id = ?`
    ).get(materialId, courseId);

    if (!material || !MATERIAL_TYPES.includes(material.type)) {
      return res.status(404).json({ error: 'Élément introuvable' });
    }

    recordMaterialViewEvent(db, {
      userId: req.user.id,
      materialId: Number(materialId),
      courseId: Number(courseId),
      source: req.body?.source || 'view',
    });

    res.json({ ok: true, viewed: true });
  });

  return router;
};

module.exports.groupMaterials = groupMaterials;
