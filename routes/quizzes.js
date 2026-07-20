const express = require('express');
const { authRequired, requireInstructorOrAdmin } = require('../middleware/auth');
const { canManageCourse, canAccessCourse } = require('./courses');

module.exports = function createQuizzesRouter(db) {
  const router = express.Router({ mergeParams: true });

  router.get('/:quizId', authRequired, (req, res) => {
    const quiz = db.prepare(`
      SELECT q.*, m.course_id
      FROM quizzes q
      JOIN modules m ON m.id = q.module_id
      WHERE q.id = ? AND q.module_id = ? AND m.course_id = ?
    `).get(req.params.quizId, req.params.moduleId, req.params.courseId);

    if (!quiz) return res.status(404).json({ error: 'Quiz introuvable' });
    if (!canAccessCourse(db, req.user, req.params.courseId) && req.user.role === 'learner') {
      return res.status(403).json({ error: 'Inscrivez-vous au cours pour y accéder' });
    }

    const questions = db.prepare(
      'SELECT id, question, options, correct_answer FROM quiz_questions WHERE quiz_id = ? ORDER BY id'
    ).all(quiz.id).map((q) => ({
      id: q.id,
      question: q.question,
      options: JSON.parse(q.options),
      ...(req.user.role === 'instructor' || req.user.role === 'admin'
        ? { correct_answer: q.correct_answer }
        : {}),
    }));

    res.json({ quiz: { ...quiz, questions } });
  });

  router.post('/', authRequired, requireInstructorOrAdmin(db), (req, res) => {
    const { courseId, moduleId } = req.params;
    if (!canManageCourse(db, req.user, courseId)) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const mod = db.prepare('SELECT id FROM modules WHERE id = ? AND course_id = ?').get(moduleId, courseId);
    if (!mod) return res.status(404).json({ error: 'Module introuvable' });

    const { title, questions } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ error: 'Le titre est requis' });
    }

    const insertQuiz = db.prepare('INSERT INTO quizzes (module_id, title) VALUES (?, ?)');
    const insertQuestion = db.prepare(
      'INSERT INTO quiz_questions (quiz_id, question, options, correct_answer) VALUES (?, ?, ?, ?)'
    );

    const createQuiz = db.transaction(() => {
      const result = insertQuiz.run(moduleId, title.trim());
      const quizId = result.lastInsertRowid;

      if (Array.isArray(questions)) {
        for (const q of questions) {
          if (!q.question?.trim() || !Array.isArray(q.options) || q.options.length < 2) continue;
          insertQuestion.run(
            quizId,
            q.question.trim(),
            JSON.stringify(q.options),
            q.correct_answer ?? 0
          );
        }
      }

      return quizId;
    });

    const quizId = createQuiz();
    const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(quizId);
    res.status(201).json({ quiz });
  });

  router.put('/:quizId', authRequired, requireInstructorOrAdmin(db), (req, res) => {
    const { courseId, moduleId, quizId } = req.params;
    if (!canManageCourse(db, req.user, courseId)) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const quiz = db.prepare(`
      SELECT q.id FROM quizzes q
      JOIN modules m ON m.id = q.module_id
      WHERE q.id = ? AND q.module_id = ? AND m.course_id = ?
    `).get(quizId, moduleId, courseId);

    if (!quiz) return res.status(404).json({ error: 'Quiz introuvable' });

    const { title, questions } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ error: 'Le titre est requis' });
    }

    const updateQuiz = db.transaction(() => {
      db.prepare('UPDATE quizzes SET title = ? WHERE id = ?').run(title.trim(), quizId);
      if (Array.isArray(questions)) {
        db.prepare('DELETE FROM quiz_questions WHERE quiz_id = ?').run(quizId);
        const insertQuestion = db.prepare(
          'INSERT INTO quiz_questions (quiz_id, question, options, correct_answer) VALUES (?, ?, ?, ?)'
        );
        for (const q of questions) {
          if (!q.question?.trim() || !Array.isArray(q.options) || q.options.length < 2) continue;
          insertQuestion.run(
            quizId,
            q.question.trim(),
            JSON.stringify(q.options),
            q.correct_answer ?? 0
          );
        }
      }
    });

    updateQuiz();
    const updated = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(quizId);
    res.json({ quiz: updated });
  });

  router.delete('/:quizId', authRequired, requireInstructorOrAdmin(db), (req, res) => {
    const { courseId, moduleId, quizId } = req.params;
    if (!canManageCourse(db, req.user, courseId)) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const quiz = db.prepare(`
      SELECT q.id FROM quizzes q
      JOIN modules m ON m.id = q.module_id
      WHERE q.id = ? AND q.module_id = ? AND m.course_id = ?
    `).get(quizId, moduleId, courseId);

    if (!quiz) return res.status(404).json({ error: 'Quiz introuvable' });

    db.prepare('DELETE FROM quizzes WHERE id = ?').run(quizId);
    res.json({ ok: true });
  });

  router.post('/:quizId/submit', authRequired, (req, res) => {
    const { courseId, moduleId, quizId } = req.params;
    const { answers } = req.body;

    const questions = db.prepare(
      'SELECT id, correct_answer FROM quiz_questions WHERE quiz_id = ? ORDER BY id'
    ).all(quizId);

    if (!questions.length) {
      return res.status(404).json({ error: 'Quiz introuvable ou sans questions' });
    }

    let correct = 0;
    const results = questions.map((q, i) => {
      const userAnswer = answers?.[i];
      const isCorrect = userAnswer === q.correct_answer;
      if (isCorrect) correct++;
      return { question_id: q.id, correct: isCorrect, correct_answer: q.correct_answer };
    });

    res.json({
      score: correct,
      total: questions.length,
      percentage: Math.round((correct / questions.length) * 100),
      results,
    });
  });

  return router;
};
