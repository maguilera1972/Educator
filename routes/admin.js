const express = require('express');
const bcrypt = require('bcryptjs');
const { authRequired, requireRole, attachUserFromDb } = require('../middleware/auth');
const { USER_PUBLIC_COLUMNS, enrichPublicUser, canReceiveTeachingAssignments, normalizeCompany } = require('../lib/users');
const {
  ASSIGNABLE_ROLES,
  canAssignAdminRole,
  isPrimaryAdmin,
  normalizeRole,
  assertRoleAssignmentAllowed,
  assertRoleChangeAllowed,
} = require('../lib/roles');
const { getSubjectLabel, getSubjectIcon, isValidSubject } = require('../lib/subjects');
const { PRIMARY_ADMIN_EMAIL } = require('../lib/roles');
const {
  validateSessionDates,
  validateTeachingAssignmentDates,
  validateSchedulesForCourses,
  getOtherInstructorsSessionDates,
  getReplacementRequestedDates,
  saveSessionDates,
  deleteSessionDates,
  deleteAllSessionDatesForUser,
  getSessionDates,
} = require('../lib/schedule');
const { sendEnrollmentConfirmationEmail } = require('../lib/enrollment-email');
const { isMailConfigured, sendMail, formatMailError } = require('../lib/mail');
const { getMailSettingsForAdmin, saveMailSettings } = require('../lib/mail-settings');
const {
  previewNewsletter,
  sendNewsletterTest,
  sendNewsletterToLearners,
  listApprovedLearners,
} = require('../lib/newsletter-email');
const {
  newsletterImageUpload,
  newsletterImageUrl,
} = require('../lib/uploads');
const {
  listCourseSessions,
  getSession,
  createCourseSession,
  updateCourseSession,
  deleteCourseSession,
  listSessionParticipants,
  addSessionParticipant,
  removeSessionParticipant,
  ensureCourseEnrollment,
  getLearnerSessionsForCourse,
} = require('../lib/sessions');
const { getParticipantAccessStats, getCourseAccessStats } = require('../lib/access-analytics');
const { deleteCourseAndRevokeAccess } = require('../lib/delete-course');
const {
  DEFAULT_EVALUATION_FORM_URL,
  normalizeEvaluationUrl,
  withEvaluationUrl,
} = require('../lib/evaluation');

function enrollLearnerInSession(db, userId, courseId, sessionDates, label) {
  const dateKey = (sessionDates || []).slice().sort().join(',');
  const existingSessions = listCourseSessions(db, courseId);
  let session = existingSessions.find(
    (s) => (s.session_dates || []).slice().sort().join(',') === dateKey
  );

  if (!session) {
    const created = createCourseSession(db, courseId, {
      label,
      session_dates: sessionDates,
    });
    if (!created.ok) return created;
    session = created.session;
  }

  const added = addSessionParticipant(db, session.id, userId, 'learner');
  if (!added.ok && added.status !== 409) return added;

  ensureCourseEnrollment(db, userId, courseId);
  return { ok: true, session };
}

function getFallbackInstructorId(db, excludeUserId) {
  const primary = db.prepare('SELECT id FROM users WHERE email = ?').get(PRIMARY_ADMIN_EMAIL);
  if (primary && primary.id !== excludeUserId) return primary.id;

  const admin = db.prepare(
    "SELECT id FROM users WHERE role = 'admin' AND id != ? ORDER BY id LIMIT 1"
  ).get(excludeUserId);
  return admin?.id || null;
}

function deleteUserCompletely(db, userId) {
  const fallbackInstructorId = getFallbackInstructorId(db, userId);
  if (!fallbackInstructorId) {
    throw new Error('Impossible de supprimer le dernier administrateur du système');
  }

  const run = db.transaction(() => {
    deleteAllSessionDatesForUser(db, userId);
    db.prepare('DELETE FROM instructor_assignments WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM enrollments WHERE user_id = ?').run(userId);
    db.prepare('UPDATE courses SET instructor_id = ? WHERE instructor_id = ?').run(
      fallbackInstructorId, userId
    );
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    if (!result.changes) {
      throw new Error('Utilisateur introuvable');
    }
  });

  run();
}

function assignInstructorToCourse(db, instructorId, courseId) {
  db.prepare('INSERT OR IGNORE INTO instructor_assignments (user_id, course_id) VALUES (?, ?)').run(
    instructorId, courseId
  );
  const assignmentCount = db.prepare(
    'SELECT COUNT(*) AS n FROM instructor_assignments WHERE course_id = ?'
  ).get(courseId).n;

  if (assignmentCount <= 1) {
    db.prepare("UPDATE courses SET instructor_id = ?, updated_at = datetime('now') WHERE id = ?").run(
      instructorId, courseId
    );
  } else {
    db.prepare("UPDATE courses SET updated_at = datetime('now') WHERE id = ?").run(courseId);
  }
}

function removeInstructorFromCourse(db, instructorId, courseId) {
  db.prepare('DELETE FROM instructor_assignments WHERE user_id = ? AND course_id = ?').run(
    instructorId, courseId
  );
  const course = db.prepare('SELECT instructor_id FROM courses WHERE id = ?').get(courseId);
  if (course?.instructor_id === instructorId) {
    const next = db.prepare(`
      SELECT ia.user_id
      FROM instructor_assignments ia
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS n
        FROM assignment_session_dates
        WHERE course_id = ? AND assignment_type = 'teaching'
        GROUP BY user_id
      ) sd ON sd.user_id = ia.user_id
      WHERE ia.course_id = ?
      ORDER BY COALESCE(sd.n, 0) DESC, ia.assigned_at ASC
      LIMIT 1
    `).get(courseId, courseId);
    const fallbackId = next?.user_id
      || db.prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1").get()?.id;
    if (fallbackId) {
      db.prepare('UPDATE courses SET instructor_id = ? WHERE id = ?').run(fallbackId, courseId);
    }
  }
}

module.exports = function createAdminRouter(db) {
  const router = express.Router();

  router.use(authRequired, attachUserFromDb(db), requireRole('admin'));

  router.get('/capabilities', (req, res) => {
    res.json({
      capabilities: {
        can_assign_admin: canAssignAdminRole(req.user),
        is_primary_admin: isPrimaryAdmin(req.user),
        assignable_roles: canAssignAdminRole(req.user)
          ? ASSIGNABLE_ROLES
          : ASSIGNABLE_ROLES.filter((role) => role !== 'admin'),
      },
    });
  });

  router.get('/mail/settings', (_req, res) => {
    res.json({ settings: getMailSettingsForAdmin() });
  });

  router.put('/mail/settings', (req, res) => {
    const result = saveMailSettings(req.body || {});
    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ ok: true, settings: result.settings, message: 'Configuration e-mail enregistrée' });
  });

  router.post('/mail/test', async (req, res) => {
    if (!isMailConfigured()) {
      return res.status(503).json({
        error: 'Microsoft 365 non configuré. Complétez les paramètres e-mail ci-dessous.',
      });
    }

    const to = req.body?.to?.trim() || req.user.email;
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return res.status(400).json({ error: 'Adresse e-mail de test invalide' });
    }

    const loginUrl = `${(process.env.PUBLIC_URL || 'https://lms-educator.eureka-training.online').replace(/\/$/, '')}/login.html`;

    try {
      const result = await sendMail({
        to,
        subject: 'Test LMS-Educator — envoi Microsoft 365',
        html: `
          <div style="font-family:Arial,sans-serif;color:#1B3A5C;line-height:1.6;">
            <p>Ce message confirme que l'envoi d'e-mails via Microsoft 365 fonctionne pour <strong>LMS-Educator</strong>.</p>
            <p>Expéditeur configuré : <strong>${process.env.MAIL_FROM || 'info@eureka-training.online'}</strong></p>
            <p><a href="${loginUrl}" style="color:#F0781A;">Accéder à la plateforme</a></p>
          </div>
        `,
        text: `Test LMS-Educator — envoi Microsoft 365 OK. Plateforme : ${loginUrl}`,
      });
      res.json({ ok: true, message: `E-mail de test envoyé à ${to}`, result });
    } catch (err) {
      console.error('[mail] Échec test envoi:', err);
      res.status(502).json({ error: formatMailError(err) });
    }
  });

  // --- Newsletter formations ---

  router.get('/newsletter/recipients', (_req, res) => {
    const recipients = listApprovedLearners(db);
    res.json({
      count: recipients.length,
      recipients: recipients.map((r) => ({ id: r.id, name: r.name, email: r.email })),
    });
  });

  router.post('/newsletter/preview', (req, res) => {
    const { subject, intro, course_ids: courseIds } = req.body || {};
    const preview = previewNewsletter(db, {
      subject,
      intro,
      course_ids: courseIds,
      recipientName: req.user.name || 'Apprenant',
    });
    res.json({ preview });
  });

  router.post('/newsletter/test', async (req, res) => {
    const { subject, intro, course_ids: courseIds, to } = req.body || {};
    try {
      const result = await sendNewsletterTest(db, {
        subject,
        intro,
        course_ids: courseIds,
        to: to?.trim() || req.user.email,
        recipientName: req.user.name || 'Administrateur',
      });
      if (!result.ok) {
        return res.status(result.error?.includes('configuré') || result.error?.includes('désactivé') ? 503 : 400)
          .json({ error: result.error });
      }
      res.json(result);
    } catch (err) {
      console.error('[newsletter] test:', err);
      res.status(502).json({ error: formatMailError(err) });
    }
  });

  router.post('/newsletter/send', async (req, res) => {
    const { subject, intro, course_ids: courseIds, confirm } = req.body || {};
    if (!confirm) {
      return res.status(400).json({
        error: 'Confirmez l\'envoi à tous les apprenants (confirm: true).',
      });
    }

    try {
      const result = await sendNewsletterToLearners(db, {
        subject,
        intro,
        course_ids: courseIds,
      });
      if (!result.ok) {
        return res.status(result.error?.includes('configuré') || result.error?.includes('désactivé') ? 503 : 400)
          .json({ error: result.error });
      }
      res.json(result);
    } catch (err) {
      console.error('[newsletter] send:', err);
      res.status(502).json({ error: formatMailError(err) });
    }
  });

  router.post('/newsletter/images', (req, res) => {
    newsletterImageUpload.single('file')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message || 'Upload impossible' });
      }
      if (!req.file) {
        return res.status(400).json({ error: 'Aucun fichier reçu' });
      }
      const url = newsletterImageUrl(req.file.filename);
      res.status(201).json({ url, filename: req.file.filename });
    });
  });

  router.get('/stats', (_req, res) => {
    const stats = {
      users: db.prepare('SELECT COUNT(*) AS n FROM users').get().n,
      learners: db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'learner'").get().n,
      instructors: db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'instructor' AND approved = 1").get().n,
      pending_instructors: db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'instructor' AND approved = 0").get().n,
      pending_learners: db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'learner' AND approved = 0").get().n,
      admins: db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'").get().n,
      courses: db.prepare('SELECT COUNT(*) AS n FROM courses').get().n,
      enrollments: db.prepare('SELECT COUNT(*) AS n FROM enrollments').get().n,
    };
    res.json({ stats });
  });

  router.get('/learner-requests', (_req, res) => {
    const requests = db.prepare(`
      SELECT ${USER_PUBLIC_COLUMNS}
      FROM users
      WHERE role = 'learner' AND approved = 0
      ORDER BY created_at ASC
    `).all();
    res.json({ requests: requests.map(enrichPublicUser) });
  });

  router.post('/learner-requests/:id/approve', async (req, res) => {
    const { course_ids: courseIds, schedules } = req.body;
    const user = db.prepare(
      "SELECT id FROM users WHERE id = ? AND role = 'learner' AND approved = 0"
    ).get(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'Demande apprenant introuvable' });
    }

    if (!Array.isArray(courseIds) || !courseIds.length) {
      return res.status(400).json({ error: 'Au moins une formation doit être assignée' });
    }

    const validIds = courseIds
      .map((id) => parseInt(id, 10))
      .filter((id) => db.prepare('SELECT id FROM courses WHERE id = ?').get(id));

    if (!validIds.length) {
      return res.status(400).json({ error: 'Aucun cours valide sélectionné' });
    }

    const scheduleCheck = validateSchedulesForCourses(db, schedules, validIds);
    if (!scheduleCheck.ok) {
      return res.status(400).json({ error: scheduleCheck.error });
    }

    db.prepare('UPDATE users SET approved = 1 WHERE id = ?').run(user.id);
    for (const courseId of validIds) {
      const enrolled = enrollLearnerInSession(
        db,
        user.id,
        courseId,
        scheduleCheck.schedules[courseId]
      );
      if (!enrolled.ok) {
        return res.status(400).json({ error: enrolled.error || 'Impossible d\'inscrire à la session' });
      }
    }

    const updated = db.prepare(`SELECT ${USER_PUBLIC_COLUMNS} FROM users WHERE id = ?`).get(user.id);

    let emailResult = { sent: false, skipped: true, reason: 'not_attempted' };
    try {
      emailResult = await sendEnrollmentConfirmationEmail(
        db,
        user.id,
        validIds,
        scheduleCheck.schedules
      );
    } catch (err) {
      console.error('[mail] Échec envoi confirmation inscription apprenant:', err);
      emailResult = { sent: false, error: err.message };
    }

    res.json({
      user: enrichPublicUser(updated),
      message: 'Apprenant validé et formations assignées',
      email: emailResult,
    });
  });

  router.post('/learner-requests/:id/reject', (req, res) => {
    const user = db.prepare(
      "SELECT id FROM users WHERE id = ? AND role = 'learner' AND approved = 0"
    ).get(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'Demande apprenant introuvable' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
    res.json({ ok: true, message: 'Inscription refusée — compte supprimé' });
  });

  router.get('/users/:id/enrollments', (req, res) => {
    const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const enrollments = db.prepare(`
      SELECT e.id, e.course_id, e.enrolled_at, c.title, c.subject, c.duration_days
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      WHERE e.user_id = ?
      ORDER BY e.enrolled_at DESC
    `).all(req.params.id).map((row) => ({
      ...row,
      subject_label: getSubjectLabel(row.subject),
      session_dates: getSessionDates(db, req.params.id, row.course_id, 'enrollment'),
      sessions: getLearnerSessionsForCourse(db, req.params.id, row.course_id),
      permanent_access: true,
    }));

    res.json({ enrollments });
  });

  router.post('/users/:id/enrollments', (req, res) => {
    const { course_id: courseId, session_dates: sessionDates, session_label: sessionLabel } = req.body;
    const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    if (user.role !== 'learner') {
      return res.status(400).json({ error: 'Seuls les apprenants peuvent recevoir des assignations de cours' });
    }

    const course = db.prepare('SELECT id, duration_days FROM courses WHERE id = ?').get(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Cours introuvable' });
    }

    const dateCheck = validateSessionDates(sessionDates, course.duration_days);
    if (!dateCheck.ok) {
      return res.status(400).json({ error: dateCheck.error });
    }

    const enrolled = enrollLearnerInSession(db, user.id, course.id, dateCheck.dates, sessionLabel);
    if (!enrolled.ok) {
      return res.status(enrolled.status || 400).json({ error: enrolled.error || 'Inscription impossible' });
    }

    res.status(201).json({
      ok: true,
      message: 'Formation assignée (accès permanent au contenu)',
      session: enrolled.session,
    });
  });

  router.delete('/users/:id/enrollments/:courseId', (req, res) => {
    // Retirer l'accès permanent et toutes les participations de session pour ce cours
    const userId = parseInt(req.params.id, 10);
    const courseId = parseInt(req.params.courseId, 10);

    db.prepare(`
      DELETE FROM session_participants
      WHERE user_id = ?
        AND session_id IN (SELECT id FROM course_sessions WHERE course_id = ?)
    `).run(userId, courseId);

    const result = db.prepare(
      'DELETE FROM enrollments WHERE user_id = ? AND course_id = ?'
    ).run(userId, courseId);
    if (!result.changes) {
      return res.status(404).json({ error: 'Inscription introuvable' });
    }
    deleteSessionDates(db, userId, courseId, 'enrollment');
    res.json({ ok: true });
  });

  // --- Sessions de formation (cohortes) ---

  router.get('/courses/:courseId/sessions', (req, res) => {
    const course = db.prepare('SELECT id, title FROM courses WHERE id = ?').get(req.params.courseId);
    if (!course) return res.status(404).json({ error: 'Cours introuvable' });
    const sessions = listCourseSessions(db, course.id).map((session) => ({
      ...session,
      participants: listSessionParticipants(db, session.id),
    }));
    res.json({ course, sessions });
  });

  router.post('/courses/:courseId/sessions', (req, res) => {
    const created = createCourseSession(db, parseInt(req.params.courseId, 10), {
      label: req.body?.label,
      session_dates: req.body?.session_dates,
    });
    if (!created.ok) return res.status(400).json({ error: created.error });
    res.status(201).json({ session: created.session });
  });

  router.put('/sessions/:sessionId', (req, res) => {
    const updated = updateCourseSession(db, parseInt(req.params.sessionId, 10), {
      label: req.body?.label,
      session_dates: req.body?.session_dates,
    });
    if (!updated.ok) return res.status(updated.error === 'Session introuvable' ? 404 : 400).json({ error: updated.error });
    res.json({ session: updated.session });
  });

  router.delete('/sessions/:sessionId', (req, res) => {
    const deleted = deleteCourseSession(db, parseInt(req.params.sessionId, 10));
    if (!deleted.ok) return res.status(404).json({ error: deleted.error });
    res.json({ ok: true });
  });

  router.get('/sessions/:sessionId/participants', (req, res) => {
    const session = getSession(db, parseInt(req.params.sessionId, 10));
    if (!session) return res.status(404).json({ error: 'Session introuvable' });
    res.json({
      session,
      participants: listSessionParticipants(db, session.id),
    });
  });

  router.post('/sessions/:sessionId/participants', (req, res) => {
    const userId = parseInt(req.body?.user_id, 10);
    if (!userId) return res.status(400).json({ error: 'user_id requis' });
    const added = addSessionParticipant(db, parseInt(req.params.sessionId, 10), userId, 'learner');
    if (!added.ok) return res.status(added.status || 400).json({ error: added.error });
    res.status(201).json({
      ok: true,
      participants: added.participants,
      message: 'Participant ajouté — accès permanent au contenu de la formation',
    });
  });

  router.delete('/sessions/:sessionId/participants/:userId', (req, res) => {
    const removed = removeSessionParticipant(
      db,
      parseInt(req.params.sessionId, 10),
      parseInt(req.params.userId, 10)
    );
    if (!removed.ok) return res.status(removed.status || 400).json({ error: removed.error });
    res.json({ ok: true });
  });

  // --- Analytics d'accès ---

  router.get('/users/:id/access-stats', (req, res) => {
    const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    const courseId = req.query.course_id ? parseInt(req.query.course_id, 10) : null;
    const stats = getParticipantAccessStats(db, user.id, courseId);
    res.json({ user: enrichPublicUser(user), ...stats });
  });

  router.get('/courses/:id/access-stats', (req, res) => {
    const course = db.prepare('SELECT id, title, subject FROM courses WHERE id = ?').get(req.params.id);
    if (!course) return res.status(404).json({ error: 'Cours introuvable' });
    const stats = getCourseAccessStats(db, course.id);
    res.json({
      course: {
        ...course,
        subject_label: getSubjectLabel(course.subject),
      },
      ...stats,
    });
  });

  router.get('/instructor-requests', (_req, res) => {
    const requests = db.prepare(`
      SELECT ${USER_PUBLIC_COLUMNS}
      FROM users
      WHERE role = 'instructor' AND approved = 0
      ORDER BY created_at ASC
    `).all();
    res.json({ requests: requests.map(enrichPublicUser) });
  });

  router.post('/instructor-requests/:id/approve', (req, res) => {
    const { course_ids: courseIds, schedules } = req.body;
    const user = db.prepare(
      "SELECT id FROM users WHERE id = ? AND role = 'instructor' AND approved = 0"
    ).get(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'Demande formateur introuvable' });
    }

    if (!Array.isArray(courseIds) || !courseIds.length) {
      return res.status(400).json({ error: 'Au moins une formation à enseigner doit être assignée' });
    }

    const validIds = courseIds
      .map((id) => parseInt(id, 10))
      .filter((id) => db.prepare('SELECT id FROM courses WHERE id = ?').get(id));

    if (!validIds.length) {
      return res.status(400).json({ error: 'Aucun cours valide sélectionné' });
    }

    const scheduleCheck = validateSchedulesForCourses(db, schedules, validIds);
    if (!scheduleCheck.ok) {
      return res.status(400).json({ error: scheduleCheck.error });
    }

    db.prepare('UPDATE users SET approved = 1, is_instructor = 1 WHERE id = ?').run(user.id);
    for (const courseId of validIds) {
      assignInstructorToCourse(db, user.id, courseId);
      saveSessionDates(db, user.id, courseId, 'teaching', scheduleCheck.schedules[courseId]);
    }

    const updated = db.prepare(`SELECT ${USER_PUBLIC_COLUMNS} FROM users WHERE id = ?`).get(user.id);
    res.json({ user: enrichPublicUser(updated), message: 'Formateur validé et formations assignées' });
  });

  router.post('/instructor-requests/:id/reject', (req, res) => {
    const user = db.prepare(
      "SELECT id FROM users WHERE id = ? AND role = 'instructor' AND approved = 0"
    ).get(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'Demande formateur introuvable' });
    }

    db.prepare("UPDATE users SET role = 'learner', approved = 1 WHERE id = ?").run(user.id);
    const updated = db.prepare(`SELECT ${USER_PUBLIC_COLUMNS} FROM users WHERE id = ?`).get(user.id);
    res.json({ user: enrichPublicUser(updated), message: 'Demande refusée — le compte est redevenu apprenant' });
  });

  router.get('/users/:id/instructor-assignments', (req, res) => {
    const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const assignments = db.prepare(`
      SELECT ia.id, ia.course_id, ia.assigned_at, c.title, c.subject, c.duration_days
      FROM instructor_assignments ia
      JOIN courses c ON c.id = ia.course_id
      WHERE ia.user_id = ?
      ORDER BY ia.assigned_at DESC
    `).all(req.params.id).map((row) => ({
      ...row,
      subject_label: getSubjectLabel(row.subject),
      session_dates: getSessionDates(db, req.params.id, row.course_id, 'teaching'),
    }));

    res.json({ assignments });
  });

  router.post('/users/:id/instructor-assignments', (req, res) => {
    const { course_id: courseId, session_dates: sessionDates } = req.body;
    const user = db.prepare('SELECT id, role, approved, is_instructor FROM users WHERE id = ?').get(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    if (!canReceiveTeachingAssignments(user)) {
      return res.status(400).json({ error: 'Seuls les formateurs validés et administrateurs formateurs peuvent recevoir des assignations' });
    }

    const course = db.prepare('SELECT id, duration_days FROM courses WHERE id = ?').get(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Cours introuvable' });
    }

    const dateCheck = validateTeachingAssignmentDates(db, user.id, course.id, sessionDates, course.duration_days);
    if (!dateCheck.ok) {
      return res.status(400).json({ error: dateCheck.error });
    }

    assignInstructorToCourse(db, user.id, course.id);
    saveSessionDates(db, user.id, course.id, 'teaching', dateCheck.dates);
    res.status(201).json({ ok: true, message: 'Formation assignée au formateur' });
  });

  router.get('/courses/:courseId/teaching-session-dates', (req, res) => {
    const courseId = parseInt(req.params.courseId, 10);
    const excludeUserId = parseInt(req.query.exclude_user_id, 10) || 0;

    const course = db.prepare('SELECT id, title, duration_days FROM courses WHERE id = ?').get(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Cours introuvable' });
    }

    const dates = getOtherInstructorsSessionDates(db, courseId, excludeUserId);
    const replacementRequested = getReplacementRequestedDates(db, courseId);

    res.json({
      course_id: courseId,
      title: course.title,
      duration_days: course.duration_days,
      dates,
      replacement_requested: replacementRequested,
      replacement_mode: dates.length > 0,
    });
  });

  router.delete('/users/:id/instructor-assignments/:courseId', (req, res) => {
    const result = db.prepare(
      'SELECT id FROM instructor_assignments WHERE user_id = ? AND course_id = ?'
    ).get(req.params.id, req.params.courseId);

    if (!result) {
      return res.status(404).json({ error: 'Assignation introuvable' });
    }

    removeInstructorFromCourse(db, parseInt(req.params.id, 10), parseInt(req.params.courseId, 10));
    deleteSessionDates(db, parseInt(req.params.id, 10), parseInt(req.params.courseId, 10), 'teaching');
    res.json({ ok: true });
  });

  router.put('/users/:id/instructor-assignments/:courseId', (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const courseId = parseInt(req.params.courseId, 10);
    const { session_dates: sessionDates } = req.body;

    const assignment = db.prepare(
      'SELECT id FROM instructor_assignments WHERE user_id = ? AND course_id = ?'
    ).get(userId, courseId);

    if (!assignment) {
      return res.status(404).json({ error: 'Assignation formateur introuvable' });
    }

    const course = db.prepare('SELECT id, duration_days, title FROM courses WHERE id = ?').get(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Cours introuvable' });
    }

    const dateCheck = validateTeachingAssignmentDates(db, userId, courseId, sessionDates, course.duration_days);
    if (!dateCheck.ok) {
      return res.status(400).json({ error: dateCheck.error });
    }

    saveSessionDates(db, userId, courseId, 'teaching', dateCheck.dates);
    res.json({
      ok: true,
      message: 'Jours de formation mis à jour',
      session_dates: dateCheck.dates,
    });
  });

  router.get('/users', (_req, res) => {
    const users = db.prepare(`
      SELECT u.id, u.email, u.name, u.role, u.approved, u.is_instructor,
        u.avatar_mode, u.avatar_generic_id, u.gravatar_available, u.company, u.created_at,
        (SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id) AS enrollment_count,
        (SELECT COUNT(*) FROM instructor_assignments ia WHERE ia.user_id = u.id) AS course_count
      FROM users u
      ORDER BY u.created_at DESC
    `).all();
    res.json({ users: users.map(enrichPublicUser) });
  });

  router.post('/users', (req, res) => {
    const { email, password, name, role, company } = req.body;

    if (!email?.trim() || !password || !name?.trim()) {
      return res.status(400).json({ error: 'Email, mot de passe et nom requis' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    const userRole = normalizeRole(role, 'learner');
    const roleError = assertRoleAssignmentAllowed(req.user, userRole);
    if (roleError) {
      return res.status(403).json({ error: roleError });
    }

    const companyResult = normalizeCompany(company, { required: userRole === 'learner' });
    if (!companyResult.ok) {
      return res.status(400).json({ error: companyResult.error });
    }

    const approved = userRole === 'instructor' ? 1 : 1;
    const isInstructor = userRole === 'instructor' || userRole === 'admin' ? 1 : 0;
    const passwordHash = bcrypt.hashSync(password, 10);

    try {
      const result = db.prepare(
        'INSERT INTO users (email, password_hash, name, role, approved, is_instructor, company) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(
        email.trim().toLowerCase(),
        passwordHash,
        name.trim(),
        userRole,
        approved,
        isInstructor,
        companyResult.company
      );

      const user = db.prepare(
        `SELECT ${USER_PUBLIC_COLUMNS} FROM users WHERE id = ?`
      ).get(result.lastInsertRowid);

      res.status(201).json({ user: enrichPublicUser(user) });
    } catch (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({ error: 'Cet email est déjà utilisé' });
      }
      throw err;
    }
  });

  router.put('/users/:id', (req, res) => {
    const { name, role, password, company, email } = req.body;
    const user = db.prepare('SELECT id, email, role, company FROM users WHERE id = ?').get(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const newRole = normalizeRole(role, user.role);
    const roleError = assertRoleChangeAllowed(req.user, user, newRole);
    if (roleError) {
      return res.status(403).json({ error: roleError });
    }

    const companyResult = normalizeCompany(
      company !== undefined ? company : user.company,
      { required: newRole === 'learner' }
    );
    if (!companyResult.ok) {
      return res.status(400).json({ error: companyResult.error });
    }

    const newName = name?.trim() || db.prepare('SELECT name FROM users WHERE id = ?').get(user.id).name;
    let newEmail = user.email;
    if (email !== undefined) {
      newEmail = String(email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail) || /\s|=/.test(newEmail)) {
        return res.status(400).json({ error: 'Adresse e-mail invalide' });
      }
      if (newEmail !== user.email) {
        const taken = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(newEmail, user.id);
        if (taken) {
          return res.status(409).json({ error: 'Cet email est déjà utilisé' });
        }
      }
    }

    const approved = newRole === 'instructor' ? 1 : 1;
    const isInstructor = newRole === 'instructor' || newRole === 'admin' ? 1 : 0;

    try {
      if (password) {
        if (password.length < 6) {
          return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
        }
        const hash = bcrypt.hashSync(password, 10);
        db.prepare('UPDATE users SET name = ?, email = ?, role = ?, approved = ?, is_instructor = ?, company = ?, password_hash = ? WHERE id = ?')
          .run(newName, newEmail, newRole, approved, isInstructor, companyResult.company, hash, user.id);
      } else {
        db.prepare('UPDATE users SET name = ?, email = ?, role = ?, approved = ?, is_instructor = ?, company = ? WHERE id = ?')
          .run(newName, newEmail, newRole, approved, isInstructor, companyResult.company, user.id);
      }
    } catch (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({ error: 'Cet email est déjà utilisé' });
      }
      throw err;
    }

    const updated = db.prepare(
      `SELECT ${USER_PUBLIC_COLUMNS} FROM users WHERE id = ?`
    ).get(user.id);

    res.json({ user: enrichPublicUser(updated) });
  });

  router.delete('/users/:id', (req, res) => {
    const userId = parseInt(req.params.id, 10);
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    const user = db.prepare('SELECT id, email, role FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    if (isPrimaryAdmin(user)) {
      return res.status(403).json({ error: 'L\'administrateur principal ne peut pas être supprimé' });
    }

    if (user.role === 'admin' && !canAssignAdminRole(req.user)) {
      return res.status(403).json({ error: 'Seul l\'administrateur principal peut supprimer un administrateur' });
    }

    try {
      deleteUserCompletely(db, userId);
      res.json({ ok: true, message: 'Utilisateur supprimé' });
    } catch (err) {
      res.status(400).json({ error: err.message || 'Impossible de supprimer cet utilisateur' });
    }
  });

  router.get('/courses/assignable', (_req, res) => {
    const courses = db.prepare(`
      SELECT c.id, c.title, c.description, c.subject, c.subsection, c.exam_code, c.duration_days,
        u.name AS instructor_name,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrollment_count
      FROM courses c
      JOIN users u ON u.id = c.instructor_id
      WHERE c.is_catalog = 1
      ORDER BY c.subject, c.subsection, c.exam_code, c.title
    `).all().map((c) => ({
      ...c,
      subject_label: getSubjectLabel(c.subject),
      subject_icon: getSubjectIcon(c.subject),
      subsection_label: c.subject === 'microsoft' ? require('../lib/microsoft-catalog').getMicrosoftSubsectionLabel(c.subsection) : '',
    }));
    res.json({ courses });
  });

  router.get('/courses', (_req, res) => {
    const courses = db.prepare(`
      SELECT c.*, u.name AS instructor_name, u.email AS instructor_email,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrollment_count
      FROM courses c
      JOIN users u ON u.id = c.instructor_id
      ORDER BY c.subject, c.updated_at DESC
    `).all().map((c) => ({
      ...c,
      subject_label: getSubjectLabel(c.subject),
      subject_icon: getSubjectIcon(c.subject),
    }));
    res.json({ courses });
  });

  router.post('/courses', (req, res) => {
    const { title, description, subject, duration_days: durationDays, evaluation_url: evaluationUrl } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ error: 'Le titre est requis' });
    }
    if (!subject || !isValidSubject(subject)) {
      return res.status(400).json({ error: 'Un sujet valide est requis' });
    }

    const duration = Math.max(1, Math.min(60, parseInt(durationDays, 10) || 1));

    const result = db.prepare(
      'INSERT INTO courses (title, description, subject, instructor_id, is_catalog, duration_days, evaluation_url) VALUES (?, ?, ?, ?, 1, ?, ?)'
    ).run(
      title.trim(),
      description?.trim() || '',
      subject,
      req.user.id,
      duration,
      normalizeEvaluationUrl(evaluationUrl)
    );

    const course = withEvaluationUrl(db.prepare('SELECT * FROM courses WHERE id = ?').get(result.lastInsertRowid));
    res.status(201).json({
      course: {
        ...course,
        subject_label: getSubjectLabel(course.subject),
        subject_icon: getSubjectIcon(course.subject),
      },
    });
  });

  router.delete('/courses/:id', (req, res) => {
    const result = deleteCourseAndRevokeAccess(db, req.params.id);
    if (!result.ok) {
      return res.status(404).json({ error: result.error });
    }
    res.json(result);
  });

  return router;
};
