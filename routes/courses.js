const express = require('express');
const { authRequired, requireInstructorOrAdmin } = require('../middleware/auth');
const { groupMaterials } = require('../lib/materials');
const { isActiveInstructor, enrichPublicUser } = require('../lib/users');
const { SUBJECTS, isValidSubject, getSubjectLabel, getSubjectIcon, getSubjectsCatalog } = require('../lib/subjects');
const {
  MICROSOFT_COURSES,
  getMicrosoftSubsectionLabel,
  getMicrosoftLevelLabel,
  groupMicrosoftCourses,
} = require('../lib/microsoft-catalog');
const {
  getSessionDates,
  getReplacementDatesForInstructor,
  setReplacementDatesForInstructor,
} = require('../lib/schedule');
const { attachTeachingInstructors } = require('../lib/course-instructors');
const { deleteCourseAndRevokeAccess } = require('../lib/delete-course');
const {
  DEFAULT_EVALUATION_FORM_URL,
  normalizeEvaluationUrl,
  withEvaluationUrl,
} = require('../lib/evaluation');

function enrichMicrosoftCourse(course) {
  if (course.subject !== 'microsoft') return course;
  const catalogEntry = MICROSOFT_COURSES.find((entry) => entry.exam_code === course.exam_code);
  course.subsection_label = getMicrosoftSubsectionLabel(course.subsection);
  course.cert_level = catalogEntry?.level || '';
  course.cert_level_label = course.cert_level ? getMicrosoftLevelLabel(course.cert_level) : '';
  return course;
}

function attachInstructorAvatar(db, course) {
  if (!course?.instructor_id) return course;
  const instructor = db.prepare(
    'SELECT id, email, name, role, approved, avatar_mode, avatar_generic_id, gravatar_available FROM users WHERE id = ?'
  ).get(course.instructor_id);
  if (instructor) {
    const enriched = enrichPublicUser(instructor);
    course.instructor_avatar_url = enriched.avatar_url;
    course.instructor_avatar_fallback = enriched.gravatar_fallback || enriched.avatar_url;
  }
  return course;
}

function mapPublicCourse(db, course) {
  attachInstructorAvatar(db, course);
  attachTeachingInstructors(db, course);
  course.subject_label = getSubjectLabel(course.subject);
  course.subject_icon = getSubjectIcon(course.subject);
  enrichMicrosoftCourse(course);
  return course;
}

function isApprovedLearner(db, user) {
  if (!user || user.role !== 'learner') return true;
  const row = db.prepare('SELECT approved FROM users WHERE id = ?').get(user.id);
  return !!row?.approved;
}

function isAssignedInstructor(db, userId, courseId) {
  return !!db.prepare(
    'SELECT id FROM instructor_assignments WHERE user_id = ? AND course_id = ?'
  ).get(userId, courseId);
}

function canManageCourse(db, user, courseId) {
  if (user.role === 'learner' && !user.is_instructor) return false;
  if (user.role === 'admin') return true;
  if (!isActiveInstructor(user, db)) return false;
  return isAssignedInstructor(db, user.id, courseId);
}

function canAccessCourse(db, user, courseId) {
  if (canManageCourse(db, user, courseId)) return true;
  if (!isApprovedLearner(db, user)) return false;
  const enrollment = db.prepare(
    'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?'
  ).get(user.id, courseId);
  return !!enrollment;
}

module.exports = function createCoursesRouter(db) {
  const router = express.Router();

  router.get('/', authRequired, (req, res) => {
    let courses;
    if (req.user.role === 'admin') {
      courses = db.prepare(`
        SELECT c.*, u.name AS instructor_name,
          (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrollment_count
        FROM courses c
        JOIN users u ON u.id = c.instructor_id
        ORDER BY c.updated_at DESC
      `).all();
    } else if (isActiveInstructor(req.user, db)) {
      courses = db.prepare(`
        SELECT c.*, u.name AS instructor_name,
          (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrollment_count
        FROM courses c
        JOIN users u ON u.id = c.instructor_id
        JOIN instructor_assignments ia ON ia.course_id = c.id AND ia.user_id = ?
        ORDER BY c.updated_at DESC
      `).all(req.user.id);
    } else {
      courses = db.prepare(`
        SELECT c.*, u.name AS instructor_name, e.enrolled_at,
          (SELECT MIN(d.session_date)
             FROM session_participants sp
             JOIN course_sessions s ON s.id = sp.session_id
             JOIN course_session_dates d ON d.session_id = s.id
            WHERE sp.user_id = e.user_id AND s.course_id = c.id AND sp.role = 'learner'
          ) AS session_start,
          (SELECT MAX(d.session_date)
             FROM session_participants sp
             JOIN course_sessions s ON s.id = sp.session_id
             JOIN course_session_dates d ON d.session_id = s.id
            WHERE sp.user_id = e.user_id AND s.course_id = c.id AND sp.role = 'learner'
          ) AS session_end
        FROM courses c
        JOIN users u ON u.id = c.instructor_id
        JOIN enrollments e ON e.course_id = c.id AND e.user_id = ?
        ORDER BY e.enrolled_at DESC
      `).all(req.user.id);
    }
    courses = courses.map((c) => {
      attachInstructorAvatar(db, c);
      attachTeachingInstructors(db, c);
      c.subject_label = getSubjectLabel(c.subject);
      c.subject_icon = getSubjectIcon(c.subject);
      c.permanent_access = true;
      if (c.session_start && c.session_end) {
        const today = new Date().toISOString().slice(0, 10);
        if (today < c.session_start) c.access_status = 'upcoming';
        else if (today > c.session_end) c.access_status = 'completed';
        else c.access_status = 'active';
      } else {
        c.access_status = 'available';
      }
      return c;
    });
    res.json({ courses });
  });

  router.get('/teaching', authRequired, (req, res) => {
    if (!isActiveInstructor(req.user, db)) {
      return res.json({ courses: [] });
    }

    const courses = db.prepare(`
      SELECT c.id, c.title, c.subject, c.updated_at, u.name AS instructor_name
      FROM courses c
      JOIN users u ON u.id = c.instructor_id
      JOIN instructor_assignments ia ON ia.course_id = c.id AND ia.user_id = ?
      ORDER BY c.title ASC, c.id ASC
    `).all(req.user.id).map((c) => {
      attachInstructorAvatar(db, c);
      attachTeachingInstructors(db, c);
      c.subject_label = getSubjectLabel(c.subject);
      c.subject_icon = getSubjectIcon(c.subject);
      return c;
    });

    res.json({ courses });
  });

  router.get('/teaching/schedule', authRequired, (req, res) => {
    if (!isActiveInstructor(req.user, db)) {
      return res.json({ assignments: [] });
    }

    const rows = db.prepare(`
      SELECT c.id AS course_id, c.title, c.subject, c.duration_days
      FROM courses c
      JOIN instructor_assignments ia ON ia.course_id = c.id AND ia.user_id = ?
      ORDER BY c.title ASC
    `).all(req.user.id);

    const assignments = rows.map((row) => ({
      ...row,
      subject_label: getSubjectLabel(row.subject),
      session_dates: getSessionDates(db, req.user.id, row.course_id, 'teaching'),
      replacement_dates: getReplacementDatesForInstructor(db, req.user.id, row.course_id),
    }));

    res.json({ assignments });
  });

  router.put('/teaching/:courseId/replacement-days', authRequired, (req, res) => {
    if (!isActiveInstructor(req.user, db)) {
      return res.status(403).json({ error: 'Instructors only' });
    }

    const courseId = parseInt(req.params.courseId, 10);
    const assigned = isAssignedInstructor(db, req.user.id, courseId);
    if (!assigned) {
      return res.status(404).json({ error: 'Course not found in your schedule' });
    }

    const result = setReplacementDatesForInstructor(
      db,
      req.user.id,
      courseId,
      req.body?.session_dates
    );
    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      ok: true,
      message: 'Replacement days saved',
      replacement_dates: result.dates,
    });
  });

  router.get('/catalog/all', (_req, res) => {
    const courses = db.prepare(`
      SELECT c.id, c.title, c.description, c.subject, c.created_at, c.instructor_id, u.name AS instructor_name,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrollment_count
      FROM courses c
      JOIN users u ON u.id = c.instructor_id
      ORDER BY c.subject, c.created_at DESC
    `).all().map((c) => mapPublicCourse(db, c));
    res.json({ courses });
  });

  router.get('/subjects', (_req, res) => {
    const courses = db.prepare(`
      SELECT c.id, c.title, c.description, c.subject, c.subsection, c.exam_code,
        c.created_at, c.instructor_id, u.name AS instructor_name,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrollment_count
      FROM courses c
      JOIN users u ON u.id = c.instructor_id
      ORDER BY c.subject, c.subsection, c.exam_code, c.created_at DESC
    `).all().map((c) => mapPublicCourse(db, c));

    const bySubject = Object.fromEntries(SUBJECTS.map((s) => [s.id, []]));
    for (const course of courses) {
      if (bySubject[course.subject]) {
        bySubject[course.subject].push(course);
      }
    }

    res.json({ subjects: getSubjectsCatalog(bySubject) });
  });

  router.get('/microsoft/catalog', (_req, res) => {
    const courses = db.prepare(`
      SELECT c.id, c.title, c.description, c.subject, c.subsection, c.exam_code,
        c.created_at, c.instructor_id, u.name AS instructor_name,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrollment_count
      FROM courses c
      JOIN users u ON u.id = c.instructor_id
      WHERE c.subject = 'microsoft'
      ORDER BY c.subsection, c.exam_code, c.title
    `).all().map((c) => mapPublicCourse(db, c));

    res.json({
      subject: 'microsoft',
      subsections: groupMicrosoftCourses(courses),
      courses,
    });
  });

  router.get('/:id', authRequired, (req, res) => {
    const course = db.prepare(`
      SELECT c.*, u.name AS instructor_name
      FROM courses c
      JOIN users u ON u.id = c.instructor_id
      WHERE c.id = ?
    `).get(req.params.id);

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    attachInstructorAvatar(db, course);
    attachTeachingInstructors(db, course);
    course.subject_label = getSubjectLabel(course.subject);
    course.subject_icon = getSubjectIcon(course.subject);

    const enrolled = !!db.prepare(
      'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?'
    ).get(req.user.id, course.id);

    const hasAccess = canAccessCourse(db, req.user, course.id);

    if (!hasAccess && req.user.role === 'learner') {
      return res.json({
        course,
        modules: [],
        materials: Object.fromEntries(['slides', 'videos', 'docs', 'labs'].map((t) => [t, []])),
        material_sections: Object.fromEntries(['slides', 'videos', 'docs', 'labs'].map((t) => [t, []])),
        enrolled: false,
        can_manage: false,
      });
    }

    const modules = db.prepare(
      'SELECT * FROM modules WHERE course_id = ? ORDER BY order_index, id'
    ).all(course.id);

    const fullModules = modules.map((mod) => {
      const lessons = db.prepare(
        'SELECT id, title, order_index FROM lessons WHERE module_id = ? ORDER BY order_index, id'
      ).all(mod.id);
      const quizzes = db.prepare(
        'SELECT id, title FROM quizzes WHERE module_id = ? ORDER BY id'
      ).all(mod.id);
      return { ...mod, lessons, quizzes };
    });

    const materialRows = db.prepare(
      'SELECT id, type, section_id, title, description, url, file_path, original_filename, mime_type, file_size, order_index, created_at FROM course_materials WHERE course_id = ? ORDER BY type, order_index, id'
    ).all(course.id);

    const sectionRows = db.prepare(
      'SELECT id, type, title, description, order_index FROM material_sections WHERE course_id = ? ORDER BY type, order_index, id'
    ).all(course.id);

    const materialSections = Object.fromEntries(
      ['slides', 'videos', 'docs', 'labs'].map((t) => [
        t,
        sectionRows.filter((s) => s.type === t).map(({ id, title, description, order_index }) => ({
          id, title, description: description || '', order_index,
        })),
      ])
    );

    const viewedIds = new Set(
      db.prepare(`
        SELECT mv.material_id
        FROM material_views mv
        JOIN course_materials cm ON cm.id = mv.material_id
        WHERE mv.user_id = ? AND cm.course_id = ?
      `).all(req.user.id, course.id).map((r) => r.material_id)
    );

    res.json({
      course: withEvaluationUrl(course),
      modules: fullModules,
      materials: groupMaterials(materialRows, course.id, viewedIds),
      material_sections: materialSections,
      video_sections: materialSections.videos,
      enrolled,
      can_manage: canManageCourse(db, req.user, course.id),
      evaluation_form_url: DEFAULT_EVALUATION_FORM_URL,
    });
  });

  router.post('/', authRequired, (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Only the administrator can create courses. Instructors receive their courses by assignmeon.',
      });
    }

    const { title, description, subject, evaluation_url: evaluationUrl } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!subject || !isValidSubject(subject)) {
      return res.status(400).json({ error: 'A valid subject is required' });
    }

    const result = db.prepare(
      'INSERT INTO courses (title, description, subject, instructor_id, evaluation_url) VALUES (?, ?, ?, ?, ?)'
    ).run(
      title.trim(),
      description?.trim() || '',
      subject,
      req.user.id,
      normalizeEvaluationUrl(evaluationUrl)
    );

    const course = withEvaluationUrl(db.prepare('SELECT * FROM courses WHERE id = ?').get(result.lastInsertRowid));
    course.subject_label = getSubjectLabel(course.subject);
    course.subject_icon = getSubjectIcon(course.subject);
    res.status(201).json({ course });
  });

  router.put('/:id', authRequired, requireInstructorOrAdmin(db), (req, res) => {
    if (!canManageCourse(db, req.user, req.params.id)) {
      return res.status(403).json({ error: 'Vous ne pouvez pas modifier ce cours' });
    }

    const { title, description, subject, evaluation_url: evaluationUrl } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (subject !== undefined && !isValidSubject(subject)) {
      return res.status(400).json({ error: 'Sujet invalide' });
    }

    const current = db.prepare('SELECT subject, evaluation_url FROM courses WHERE id = ?').get(req.params.id);
    const nextSubject = subject ?? current.subject;
    const nextEvaluationUrl = evaluationUrl !== undefined
      ? normalizeEvaluationUrl(evaluationUrl)
      : normalizeEvaluationUrl(current?.evaluation_url);

    db.prepare(
      "UPDATE courses SET title = ?, description = ?, subject = ?, evaluation_url = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(title.trim(), description?.trim() || '', nextSubject, nextEvaluationUrl, req.params.id);

    const course = withEvaluationUrl(db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id));
    course.subject_label = getSubjectLabel(course.subject);
    course.subject_icon = getSubjectIcon(course.subject);
    res.json({ course });
  });

  router.delete('/:id', authRequired, requireInstructorOrAdmin(db), (req, res) => {
    if (!canManageCourse(db, req.user, req.params.id)) {
      return res.status(403).json({ error: 'Vous ne pouvez pas supprimer ce cours' });
    }

    const result = deleteCourseAndRevokeAccess(db, req.params.id);
    if (!result.ok) {
      return res.status(404).json({ error: result.error });
    }
    res.json(result);
  });

  router.post('/:id/enroll', authRequired, (_req, res) => {
    res.status(403).json({
      error: 'Course assignment is reserved for the administrator. Contact your training manager.',
    });
  });

  return router;
};

module.exports.canManageCourse = canManageCourse;
module.exports.canAccessCourse = canAccessCourse;
module.exports.isAssignedInstructor = isAssignedInstructor;
