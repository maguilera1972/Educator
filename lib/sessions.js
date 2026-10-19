const { normalizeSessionDates, validateSessionDates, saveSessionDates, deleteSessionDates, getSessionDates } = require('./schedule');

function formatSessionLabel(dates) {
  const normalized = normalizeSessionDates(dates);
  if (!normalized.length) return 'Session';
  const first = normalized[0];
  const last = normalized[normalized.length - 1];
  if (first === last) return `Session ${first}`;
  return `Session ${first} → ${last}`;
}

function getSessionDatesById(db, sessionId) {
  return db.prepare(`
    SELECT session_date AS date
    FROM course_session_dates
    WHERE session_id = ?
    ORDER BY session_date ASC
  `).all(sessionId).map((row) => row.date);
}

function listCourseSessions(db, courseId) {
  return db.prepare(`
    SELECT s.id, s.course_id, s.label, s.created_at,
      (SELECT COUNT(*) FROM session_participants sp WHERE sp.session_id = s.id AND sp.role = 'learner') AS learner_count,
      (SELECT MIN(session_date) FROM course_session_dates d WHERE d.session_id = s.id) AS starts_on,
      (SELECT MAX(session_date) FROM course_session_dates d WHERE d.session_id = s.id) AS ends_on
    FROM course_sessions s
    WHERE s.course_id = ?
    ORDER BY COALESCE(starts_on, s.created_at) DESC, s.id DESC
  `).all(courseId).map((row) => ({
    ...row,
    session_dates: getSessionDatesById(db, row.id),
  }));
}

function getSession(db, sessionId) {
  const session = db.prepare(`
    SELECT s.*, c.title AS course_title, c.duration_days, c.subject
    FROM course_sessions s
    JOIN courses c ON c.id = s.course_id
    WHERE s.id = ?
  `).get(sessionId);
  if (!session) return null;
  session.session_dates = getSessionDatesById(db, sessionId);
  return session;
}

function saveSessionDateRows(db, sessionId, dates) {
  const normalized = normalizeSessionDates(dates);
  db.prepare('DELETE FROM course_session_dates WHERE session_id = ?').run(sessionId);
  const insert = db.prepare(
    'INSERT INTO course_session_dates (session_id, session_date) VALUES (?, ?)'
  );
  for (const date of normalized) {
    insert.run(sessionId, date);
  }
  return normalized;
}

function createCourseSession(db, courseId, { label, session_dates: sessionDates } = {}) {
  const course = db.prepare('SELECT id, duration_days FROM courses WHERE id = ?').get(courseId);
  if (!course) return { ok: false, error: 'Course not found' };

  const dateCheck = validateSessionDates(sessionDates, course.duration_days);
  if (!dateCheck.ok) return { ok: false, error: dateCheck.error };

  const sessionLabel = (label && String(label).trim()) || formatSessionLabel(dateCheck.dates);
  const result = db.prepare(
    'INSERT INTO course_sessions (course_id, label) VALUES (?, ?)'
  ).run(courseId, sessionLabel);

  const sessionId = Number(result.lastInsertRowid);
  saveSessionDateRows(db, sessionId, dateCheck.dates);

  return {
    ok: true,
    session: getSession(db, sessionId),
  };
}

function updateCourseSession(db, sessionId, { label, session_dates: sessionDates } = {}) {
  const session = getSession(db, sessionId);
  if (!session) return { ok: false, error: 'Session not found' };

  if (sessionDates !== undefined) {
    const dateCheck = validateSessionDates(sessionDates, session.duration_days);
    if (!dateCheck.ok) return { ok: false, error: dateCheck.error };
    saveSessionDateRows(db, sessionId, dateCheck.dates);

    // Keep participant calendar dates in sync for learners in this session
    const learners = db.prepare(`
      SELECT user_id FROM session_participants
      WHERE session_id = ? AND role = 'learner'
    `).all(sessionId);
    for (const learner of learners) {
      saveSessionDates(db, learner.user_id, session.course_id, 'enrollment', dateCheck.dates);
    }
  }

  if (label !== undefined) {
    const nextLabel = String(label || '').trim() || formatSessionLabel(getSessionDatesById(db, sessionId));
    db.prepare('UPDATE course_sessions SET label = ? WHERE id = ?').run(nextLabel, sessionId);
  }

  return { ok: true, session: getSession(db, sessionId) };
}

function deleteCourseSession(db, sessionId) {
  const session = getSession(db, sessionId);
  if (!session) return { ok: false, error: 'Session not found' };

  const participants = db.prepare(
    'SELECT user_id, role FROM session_participants WHERE session_id = ?'
  ).all(sessionId);

  db.prepare('DELETE FROM course_sessions WHERE id = ?').run(sessionId);

  // Remove enrollment calendar dates only if the learner has no other sessions on this course
  for (const participant of participants) {
    if (participant.role !== 'learner') continue;
    const other = db.prepare(`
      SELECT COUNT(*) AS n
      FROM session_participants sp
      JOIN course_sessions s ON s.id = sp.session_id
      WHERE sp.user_id = ? AND s.course_id = ? AND sp.role = 'learner'
    `).get(participant.user_id, session.course_id);
    if (!other?.n) {
      deleteSessionDates(db, participant.user_id, session.course_id, 'enrollment');
      // Keep enrollment row for permanent content access
    } else {
      // Refresh dates from remaining sessions (union of dates)
      const remainingDates = db.prepare(`
        SELECT DISTINCT d.session_date AS date
        FROM session_participants sp
        JOIN course_sessions s ON s.id = sp.session_id
        JOIN course_session_dates d ON d.session_id = s.id
        WHERE sp.user_id = ? AND s.course_id = ? AND sp.role = 'learner'
        ORDER BY d.session_date ASC
      `).all(participant.user_id, session.course_id).map((r) => r.date);
      saveSessionDates(db, participant.user_id, session.course_id, 'enrollment', remainingDates);
    }
  }

  return { ok: true };
}

function ensureCourseEnrollment(db, userId, courseId) {
  db.prepare(
    'INSERT OR IGNORE INTO enrollments (user_id, course_id) VALUES (?, ?)'
  ).run(userId, courseId);
}

function listSessionParticipants(db, sessionId) {
  return db.prepare(`
    SELECT sp.user_id, sp.role, sp.enrolled_at, u.name, u.email, u.approved
    FROM session_participants sp
    JOIN users u ON u.id = sp.user_id
    WHERE sp.session_id = ?
    ORDER BY sp.role ASC, u.name ASC
  `).all(sessionId);
}

function addSessionParticipant(db, sessionId, userId, role = 'learner') {
  const session = getSession(db, sessionId);
  if (!session) return { ok: false, error: 'Session not found' };

  const user = db.prepare('SELECT id, role, approved FROM users WHERE id = ?').get(userId);
  if (!user) return { ok: false, error: 'User not found' };

  if (role === 'learner' && user.role !== 'learner') {
    return { ok: false, error: 'Only learners can be enrolled as participants' };
  }

  try {
    db.prepare(`
      INSERT INTO session_participants (session_id, user_id, role)
      VALUES (?, ?, ?)
    `).run(sessionId, userId, role);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return { ok: false, error: 'This participant is already enrolled in this session', status: 409 };
    }
    throw err;
  }

  if (role === 'learner') {
    ensureCourseEnrollment(db, userId, session.course_id);
    const dates = getSessionDatesById(db, sessionId);
    // Merge with existing enrollment dates from other sessions
    const existing = getSessionDates(db, userId, session.course_id, 'enrollment');
    saveSessionDates(db, userId, session.course_id, 'enrollment', [...existing, ...dates]);
  }

  return { ok: true, participants: listSessionParticipants(db, sessionId) };
}

function removeSessionParticipant(db, sessionId, userId) {
  const session = getSession(db, sessionId);
  if (!session) return { ok: false, error: 'Session not found' };

  const result = db.prepare(
    'DELETE FROM session_participants WHERE session_id = ? AND user_id = ?'
  ).run(sessionId, userId);

  if (!result.changes) {
    return { ok: false, error: 'Participant not found in this session', status: 404 };
  }

  const other = db.prepare(`
    SELECT COUNT(*) AS n
    FROM session_participants sp
    JOIN course_sessions s ON s.id = sp.session_id
    WHERE sp.user_id = ? AND s.course_id = ? AND sp.role = 'learner'
  `).get(userId, session.course_id);

  if (!other?.n) {
    deleteSessionDates(db, userId, session.course_id, 'enrollment');
    // Keep enrollments for permanent content access
  } else {
    const remainingDates = db.prepare(`
      SELECT DISTINCT d.session_date AS date
      FROM session_participants sp
      JOIN course_sessions s ON s.id = sp.session_id
      JOIN course_session_dates d ON d.session_id = s.id
      WHERE sp.user_id = ? AND s.course_id = ? AND sp.role = 'learner'
      ORDER BY d.session_date ASC
    `).all(userId, session.course_id).map((r) => r.date);
    saveSessionDates(db, userId, session.course_id, 'enrollment', remainingDates);
  }

  return { ok: true };
}

function getLearnerSessionsForCourse(db, userId, courseId) {
  return db.prepare(`
    SELECT s.id, s.label, s.created_at,
      (SELECT MIN(session_date) FROM course_session_dates d WHERE d.session_id = s.id) AS starts_on,
      (SELECT MAX(session_date) FROM course_session_dates d WHERE d.session_id = s.id) AS ends_on
    FROM course_sessions s
    JOIN session_participants sp ON sp.session_id = s.id
    WHERE s.course_id = ? AND sp.user_id = ? AND sp.role = 'learner'
    ORDER BY COALESCE(starts_on, s.created_at) DESC
  `).all(courseId, userId).map((row) => ({
    ...row,
    session_dates: getSessionDatesById(db, row.id),
  }));
}

function migrateLegacyEnrollmentsToSessions(db) {
  const hasSessions = db.prepare('SELECT COUNT(*) AS n FROM course_sessions').get().n;
  if (hasSessions > 0) return { migrated: 0 };

  const enrollments = db.prepare(`
    SELECT e.user_id, e.course_id, e.enrolled_at
    FROM enrollments e
    ORDER BY e.course_id, e.enrolled_at
  `).all();

  let migrated = 0;
  const byCourseDates = new Map();

  for (const enrollment of enrollments) {
    const dates = getSessionDates(db, enrollment.user_id, enrollment.course_id, 'enrollment');
    if (!dates.length) continue;
    const key = `${enrollment.course_id}::${dates.join(',')}`;
    if (!byCourseDates.has(key)) {
      byCourseDates.set(key, {
        courseId: enrollment.course_id,
        dates,
        userIds: [],
      });
    }
    byCourseDates.get(key).userIds.push(enrollment.user_id);
  }

  for (const group of byCourseDates.values()) {
    const created = createCourseSession(db, group.courseId, {
      label: formatSessionLabel(group.dates),
      session_dates: group.dates,
    });
    if (!created.ok) continue;
    for (const userId of group.userIds) {
      db.prepare(`
        INSERT OR IGNORE INTO session_participants (session_id, user_id, role)
        VALUES (?, ?, 'learner')
      `).run(created.session.id, userId);
      migrated += 1;
    }
  }

  return { migrated };
}

module.exports = {
  formatSessionLabel,
  listCourseSessions,
  getSession,
  getSessionDatesById,
  createCourseSession,
  updateCourseSession,
  deleteCourseSession,
  listSessionParticipants,
  addSessionParticipant,
  removeSessionParticipant,
  getLearnerSessionsForCourse,
  ensureCourseEnrollment,
  migrateLegacyEnrollmentsToSessions,
};
