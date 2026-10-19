const express = require('express');
const { authRequired, requireInstructorOrAdmin } = require('../middleware/auth');
const { canManageCourse } = require('./courses');

module.exports = function createModulesRouter(db) {
  const router = express.Router({ mergeParams: true });

  router.post('/', authRequired, requireInstructorOrAdmin(db), (req, res) => {
    const courseId = req.params.courseId;
    if (!canManageCourse(db, req.user, courseId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { title, order_index } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const maxOrder = db.prepare(
      'SELECT COALESCE(MAX(order_index), -1) AS max_order FROM modules WHERE course_id = ?'
    ).get(courseId);

    const result = db.prepare(
      'INSERT INTO modules (course_id, title, order_index) VALUES (?, ?, ?)'
    ).run(courseId, title.trim(), order_index ?? maxOrder.max_order + 1);

    const module = db.prepare('SELECT * FROM modules WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ module });
  });

  router.put('/:moduleId', authRequired, requireInstructorOrAdmin(db), (req, res) => {
    const mod = db.prepare('SELECT * FROM modules WHERE id = ? AND course_id = ?').get(
      req.params.moduleId, req.params.courseId
    );
    if (!mod) return res.status(404).json({ error: 'Module not found' });
    if (!canManageCourse(db, req.user, req.params.courseId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { title, order_index } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    db.prepare('UPDATE modules SET title = ?, order_index = ? WHERE id = ?').run(
      title.trim(), order_index ?? mod.order_index, mod.id
    );

    const module = db.prepare('SELECT * FROM modules WHERE id = ?').get(mod.id);
    res.json({ module });
  });

  router.delete('/:moduleId', authRequired, requireInstructorOrAdmin(db), (req, res) => {
    const mod = db.prepare('SELECT * FROM modules WHERE id = ? AND course_id = ?').get(
      req.params.moduleId, req.params.courseId
    );
    if (!mod) return res.status(404).json({ error: 'Module not found' });
    if (!canManageCourse(db, req.user, req.params.courseId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    db.prepare('DELETE FROM modules WHERE id = ?').run(mod.id);
    res.json({ ok: true });
  });

  return router;
};
