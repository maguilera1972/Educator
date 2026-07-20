const express = require('express');
const { authRequired, requireInstructorOrAdmin } = require('../middleware/auth');
const { canManageCourse, canAccessCourse } = require('./courses');
const { MATERIAL_TYPES } = require('../lib/materials');

function parseType(value) {
  return MATERIAL_TYPES.includes(value) ? value : null;
}

module.exports = function createMaterialSectionsRouter(db) {
  const router = express.Router({ mergeParams: true });

  router.get('/', authRequired, (req, res) => {
    const courseId = req.params.courseId;
    const type = parseType(req.query.type);
    if (!type) {
      return res.status(400).json({ error: 'Paramètre type requis (slides, videos, docs, labs)' });
    }

    const course = db.prepare('SELECT id FROM courses WHERE id = ?').get(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Cours introuvable' });
    }
    if (!canAccessCourse(db, req.user, courseId) && req.user.role === 'learner') {
      return res.status(403).json({ error: 'Inscrivez-vous au cours pour accéder au matériel' });
    }

    const sections = db.prepare(
      'SELECT id, title, description, order_index, type FROM material_sections WHERE course_id = ? AND type = ? ORDER BY order_index, id'
    ).all(courseId, type);

    res.json({ sections, type });
  });

  router.post('/', authRequired, requireInstructorOrAdmin(db), (req, res) => {
    const courseId = req.params.courseId;
    if (!canManageCourse(db, req.user, courseId)) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const type = parseType(req.body.type);
    if (!type) {
      return res.status(400).json({ error: 'Type invalide (slides, videos, docs, labs)' });
    }

    const title = req.body.title?.trim();
    const description = req.body.description?.trim() || '';
    if (!title) {
      return res.status(400).json({ error: 'Le titre est requis' });
    }

    const row = db.prepare(
      'SELECT COALESCE(MAX(order_index), -1) AS max_order FROM material_sections WHERE course_id = ? AND type = ?'
    ).get(courseId, type);

    const result = db.prepare(
      'INSERT INTO material_sections (course_id, type, title, description, order_index) VALUES (?, ?, ?, ?, ?)'
    ).run(courseId, type, title, description, row.max_order + 1);

    const section = db.prepare(
      'SELECT id, title, description, order_index, type FROM material_sections WHERE id = ?'
    ).get(result.lastInsertRowid);

    res.status(201).json({ section });
  });

  router.put('/:sectionId', authRequired, requireInstructorOrAdmin(db), (req, res) => {
    const { courseId, sectionId } = req.params;
    if (!canManageCourse(db, req.user, courseId)) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const section = db.prepare(
      'SELECT id FROM material_sections WHERE id = ? AND course_id = ?'
    ).get(sectionId, courseId);

    if (!section) {
      return res.status(404).json({ error: 'Section introuvable' });
    }

    const title = req.body.title?.trim();
    const description = req.body.description?.trim() || '';
    if (!title) {
      return res.status(400).json({ error: 'Le titre est requis' });
    }

    db.prepare('UPDATE material_sections SET title = ?, description = ? WHERE id = ?').run(title, description, sectionId);

    const updated = db.prepare(
      'SELECT id, title, description, order_index, type FROM material_sections WHERE id = ?'
    ).get(sectionId);

    res.json({ section: updated });
  });

  router.delete('/:sectionId', authRequired, requireInstructorOrAdmin(db), (req, res) => {
    const { courseId, sectionId } = req.params;
    if (!canManageCourse(db, req.user, courseId)) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const section = db.prepare(
      'SELECT id FROM material_sections WHERE id = ? AND course_id = ?'
    ).get(sectionId, courseId);

    if (!section) {
      return res.status(404).json({ error: 'Section introuvable' });
    }

    db.prepare('UPDATE course_materials SET section_id = NULL WHERE section_id = ?').run(sectionId);
    db.prepare('DELETE FROM material_sections WHERE id = ?').run(sectionId);

    res.json({ ok: true });
  });

  return router;
};
