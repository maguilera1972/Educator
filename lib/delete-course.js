const fs = require('fs');
const path = require('path');
const { UPLOADS_ROOT, deleteStoredFile } = require('./uploads');

function tableExists(db, name) {
  return !!db.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?"
  ).get(name);
}

/**
 * Delete a course and revoke all learner/instructor access to it.
 * Never deletes user accounts.
 */
function deleteCourseAndRevokeAccess(db, courseId) {
  const id = parseInt(courseId, 10);
  if (!id) return { ok: false, error: 'Invalid course id' };

  const course = db.prepare('SELECT id, title FROM courses WHERE id = ?').get(id);
  if (!course) return { ok: false, error: 'Course not found' };

  const run = db.transaction(() => {
    const revokedLearners = db.prepare(
      'SELECT COUNT(*) AS n FROM enrollments WHERE course_id = ?'
    ).get(id).n;

    const revokedInstructors = tableExists(db, 'instructor_assignments')
      ? db.prepare('SELECT COUNT(*) AS n FROM instructor_assignments WHERE course_id = ?').get(id).n
      : 0;

    // Explicit access cleanup (keeps users intact)
    db.prepare('DELETE FROM enrollments WHERE course_id = ?').run(id);

    if (tableExists(db, 'instructor_assignments')) {
      db.prepare('DELETE FROM instructor_assignments WHERE course_id = ?').run(id);
    }
    if (tableExists(db, 'assignment_session_dates')) {
      db.prepare('DELETE FROM assignment_session_dates WHERE course_id = ?').run(id);
    }
    if (tableExists(db, 'teaching_replacement_requests')) {
      db.prepare('DELETE FROM teaching_replacement_requests WHERE course_id = ?').run(id);
    }
    if (tableExists(db, 'material_view_events')) {
      db.prepare('DELETE FROM material_view_events WHERE course_id = ?').run(id);
    }
    if (tableExists(db, 'material_views')) {
      db.prepare(`
        DELETE FROM material_views
        WHERE material_id IN (SELECT id FROM course_materials WHERE course_id = ?)
      `).run(id);
    }

    // Sessions + participants
    if (tableExists(db, 'session_participants') && tableExists(db, 'course_sessions')) {
      db.prepare(`
        DELETE FROM session_participants
        WHERE session_id IN (SELECT id FROM course_sessions WHERE course_id = ?)
      `).run(id);
    }
    if (tableExists(db, 'course_session_dates') && tableExists(db, 'course_sessions')) {
      db.prepare(`
        DELETE FROM course_session_dates
        WHERE session_id IN (SELECT id FROM course_sessions WHERE course_id = ?)
      `).run(id);
    }
    if (tableExists(db, 'course_sessions')) {
      db.prepare('DELETE FROM course_sessions WHERE course_id = ?').run(id);
    }

    // Materials files + rows
    const materials = tableExists(db, 'course_materials')
      ? db.prepare('SELECT id, file_path FROM course_materials WHERE course_id = ?').all(id)
      : [];
    for (const material of materials) {
      deleteStoredFile(material.file_path);
    }
    if (tableExists(db, 'course_materials')) {
      db.prepare('DELETE FROM course_materials WHERE course_id = ?').run(id);
    }
    if (tableExists(db, 'material_sections')) {
      db.prepare('DELETE FROM material_sections WHERE course_id = ?').run(id);
    }

    // Modules / lessons / quizzes
    if (tableExists(db, 'quiz_questions')) {
      db.prepare(`
        DELETE FROM quiz_questions
        WHERE quiz_id IN (
          SELECT q.id FROM quizzes q
          JOIN modules m ON m.id = q.module_id
          WHERE m.course_id = ?
        )
      `).run(id);
    }
    if (tableExists(db, 'quiz_attempts')) {
      db.prepare(`
        DELETE FROM quiz_attempts
        WHERE quiz_id IN (
          SELECT q.id FROM quizzes q
          JOIN modules m ON m.id = q.module_id
          WHERE m.course_id = ?
        )
      `).run(id);
    }
    if (tableExists(db, 'quizzes')) {
      db.prepare(`
        DELETE FROM quizzes
        WHERE module_id IN (SELECT id FROM modules WHERE course_id = ?)
      `).run(id);
    }
    if (tableExists(db, 'lessons')) {
      db.prepare(`
        DELETE FROM lessons
        WHERE module_id IN (SELECT id FROM modules WHERE course_id = ?)
      `).run(id);
    }
    if (tableExists(db, 'modules')) {
      db.prepare('DELETE FROM modules WHERE course_id = ?').run(id);
    }

    db.prepare('DELETE FROM courses WHERE id = ?').run(id);

    return {
      revoked_learners: revokedLearners,
      revoked_instructors: revokedInstructors,
    };
  });

  const stats = run();

  // Remove leftover upload directory for this course
  const courseUploadDir = path.join(UPLOADS_ROOT, 'courses', String(id));
  try {
    if (fs.existsSync(courseUploadDir)) {
      fs.rmSync(courseUploadDir, { recursive: true, force: true });
    }
  } catch (err) {
    console.warn('[delete-course] Impossible de supprimer le dossier uploads:', err.message);
  }

  return {
    ok: true,
    course_id: id,
    title: course.title,
    revoked_learners: stats.revoked_learners,
    revoked_instructors: stats.revoked_instructors,
    message: `Course deleted. Access removed for ${stats.revoked_learners} learner(s)`
      + (stats.revoked_instructors ? ` et ${stats.revoked_instructors} formateur(s)` : '')
      + '. User accounts are kept.',
  };
}

module.exports = { deleteCourseAndRevokeAccess };
