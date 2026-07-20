const express = require('express');
const { authRequired, requireInstructorOrAdmin } = require('../middleware/auth');
const { canManageCourse, canAccessCourse } = require('./courses');

module.exports = function createLessonsRouter(db) {
  const router = express.Router({ mergeParams: true });

  router.get('/:lessonId', authRequired, (req, res) => {
    const lesson = db.prepare(`
      SELECT l.*, m.course_id
      FROM lessons l
      JOIN modules m ON m.id = l.module_id
      WHERE l.id = ? AND l.module_id = ? AND m.course_id = ?
    `).get(req.params.lessonId, req.params.moduleId, req.params.courseId);

    if (!lesson) return res.status(404).json({ error: 'Leçon introuvable' });
    if (!canAccessCourse(db, req.user, req.params.courseId) && req.user.role === 'learner') {
      return res.status(403).json({ error: 'Inscrivez-vous au cours pour y accéder' });
    }
    res.json({ lesson });
  });

  router.post('/', authRequired, requireInstructorOrAdmin(db), (req, res) => {
    const { courseId, moduleId } = req.params;
    if (!canManageCourse(db, req.user, courseId)) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const mod = db.prepare('SELECT id FROM modules WHERE id = ? AND course_id = ?').get(moduleId, courseId);
    if (!mod) return res.status(404).json({ error: 'Module introuvable' });

    const { title, content, order_index } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ error: 'Le titre est requis' });
    }

    const maxOrder = db.prepare(
      'SELECT COALESCE(MAX(order_index), -1) AS max_order FROM lessons WHERE module_id = ?'
    ).get(moduleId);

    const result = db.prepare(
      'INSERT INTO lessons (module_id, title, content, order_index) VALUES (?, ?, ?, ?)'
    ).run(moduleId, title.trim(), content?.trim() || '', order_index ?? maxOrder.max_order + 1);

    const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ lesson });
  });

  router.put('/:lessonId', authRequired, requireInstructorOrAdmin(db), (req, res) => {
    const { courseId, moduleId, lessonId } = req.params;
    if (!canManageCourse(db, req.user, courseId)) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const lesson = db.prepare(`
      SELECT l.* FROM lessons l
      JOIN modules m ON m.id = l.module_id
      WHERE l.id = ? AND l.module_id = ? AND m.course_id = ?
    `).get(lessonId, moduleId, courseId);

    if (!lesson) return res.status(404).json({ error: 'Leçon introuvable' });

    const { title, content, order_index } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ error: 'Le titre est requis' });
    }

    db.prepare('UPDATE lessons SET title = ?, content = ?, order_index = ? WHERE id = ?').run(
      title.trim(), content?.trim() || '', order_index ?? lesson.order_index, lessonId
    );

    const updated = db.prepare('SELECT * FROM lessons WHERE id = ?').get(lessonId);
    res.json({ lesson: updated });
  });

  router.delete('/:lessonId', authRequired, requireInstructorOrAdmin(db), (req, res) => {
    const { courseId, moduleId, lessonId } = req.params;
    if (!canManageCourse(db, req.user, courseId)) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const lesson = db.prepare(`
      SELECT l.id FROM lessons l
      JOIN modules m ON m.id = l.module_id
      WHERE l.id = ? AND l.module_id = ? AND m.course_id = ?
    `).get(lessonId, moduleId, courseId);

    if (!lesson) return res.status(404).json({ error: 'Leçon introuvable' });

    db.prepare('DELETE FROM lessons WHERE id = ?').run(lessonId);
    res.json({ ok: true });
  });

  return router;
};
