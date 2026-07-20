const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function normalizeSessionDates(dates) {
  if (!Array.isArray(dates)) return [];
  return [...new Set(
    dates
      .map((d) => String(d).slice(0, 10))
      .filter((d) => DATE_RE.test(d))
  )].sort();
}

function validateSessionDates(dates, durationDays, options = {}) {
  const normalized = normalizeSessionDates(dates);
  const maxDays = Math.max(1, parseInt(durationDays, 10) || 1);
  const allowedDates = options.allowedDates?.length
    ? normalizeSessionDates(options.allowedDates)
    : null;
  const effectiveMax = allowedDates ? allowedDates.length : maxDays;

  if (normalized.length === 0) {
    return {
      ok: false,
      error: 'Sélectionnez au moins un jour de formation.',
      dates: normalized,
    };
  }

  if (normalized.length > effectiveMax) {
    return {
      ok: false,
      error: allowedDates
        ? `Sélectionnez au maximum ${effectiveMax} jour(s) parmi la planification existante (${normalized.length} sélectionné(s)).`
        : `Sélectionnez au maximum ${maxDays} jour(s) de formation (${normalized.length} sélectionné(s)).`,
      dates: normalized,
    };
  }

  if (allowedDates) {
    const allowed = new Set(allowedDates);
    const invalid = normalized.filter((d) => !allowed.has(d));
    if (invalid.length) {
      return {
        ok: false,
        error: 'Les jours choisis doivent faire partie de la planification existante du cours.',
        dates: normalized,
      };
    }
  }

  return {
    ok: true,
    dates: normalized,
    durationDays: maxDays,
    isReplacement: !!allowedDates,
  };
}

function getOtherInstructorsSessionDates(db, courseId, excludeUserId) {
  return db.prepare(`
    SELECT DISTINCT sd.session_date AS date, u.name AS instructor_name
    FROM assignment_session_dates sd
    JOIN users u ON u.id = sd.user_id
    WHERE sd.course_id = ?
      AND sd.assignment_type = 'teaching'
      AND sd.user_id != ?
    ORDER BY sd.session_date ASC
  `).all(courseId, excludeUserId);
}

function getReplacementRequestedDates(db, courseId) {
  return db.prepare(`
    SELECT trr.session_date AS date, u.name AS instructor_name, trr.user_id
    FROM teaching_replacement_requests trr
    JOIN users u ON u.id = trr.user_id
    WHERE trr.course_id = ?
    ORDER BY trr.session_date ASC
  `).all(courseId);
}

function getReplacementDatesForInstructor(db, userId, courseId) {
  return db.prepare(`
    SELECT session_date AS date
    FROM teaching_replacement_requests
    WHERE user_id = ? AND course_id = ?
    ORDER BY session_date ASC
  `).all(userId, courseId).map((row) => row.date);
}

function setReplacementDatesForInstructor(db, userId, courseId, dates) {
  const ownDates = getSessionDates(db, userId, courseId, 'teaching');
  if (!ownDates.length) {
    return { ok: false, error: 'Aucun jour planifié pour cette formation.' };
  }

  const normalized = normalizeSessionDates(dates);
  const invalid = normalized.filter((d) => !ownDates.includes(d));
  if (invalid.length) {
    return { ok: false, error: 'Vous ne pouvez demander un remplacement que pour vos propres jours planifiés.' };
  }

  db.prepare('DELETE FROM teaching_replacement_requests WHERE user_id = ? AND course_id = ?')
    .run(userId, courseId);
  const insert = db.prepare(
    'INSERT INTO teaching_replacement_requests (user_id, course_id, session_date) VALUES (?, ?, ?)'
  );
  for (const sessionDate of normalized) {
    insert.run(userId, courseId, sessionDate);
  }

  return { ok: true, dates: normalized };
}

function validateTeachingAssignmentDates(db, userId, courseId, dates, durationDays) {
  const allowedRows = getOtherInstructorsSessionDates(db, courseId, userId);
  const allowedDates = allowedRows.map((row) => row.date);
  if (allowedDates.length > 0) {
    return validateSessionDates(dates, durationDays, { allowedDates });
  }
  return validateSessionDates(dates, durationDays);
}

function getCourseDurationDays(db, courseId) {
  const row = db.prepare('SELECT duration_days FROM courses WHERE id = ?').get(courseId);
  return Math.max(1, row?.duration_days ?? 1);
}

function saveSessionDates(db, userId, courseId, assignmentType, dates) {
  const del = db.prepare(
    'DELETE FROM assignment_session_dates WHERE user_id = ? AND course_id = ? AND assignment_type = ?'
  );
  const ins = db.prepare(
    'INSERT INTO assignment_session_dates (user_id, course_id, assignment_type, session_date) VALUES (?, ?, ?, ?)'
  );

  const tx = db.transaction(() => {
    del.run(userId, courseId, assignmentType);
    for (const sessionDate of dates) {
      ins.run(userId, courseId, assignmentType, sessionDate);
    }
  });
  tx();
}

function deleteSessionDates(db, userId, courseId, assignmentType) {
  db.prepare(
    'DELETE FROM assignment_session_dates WHERE user_id = ? AND course_id = ? AND assignment_type = ?'
  ).run(userId, courseId, assignmentType);
}

function deleteAllSessionDatesForUser(db, userId) {
  db.prepare('DELETE FROM assignment_session_dates WHERE user_id = ?').run(userId);
}

function getSessionDates(db, userId, courseId, assignmentType) {
  return db.prepare(`
    SELECT session_date
    FROM assignment_session_dates
    WHERE user_id = ? AND course_id = ? AND assignment_type = ?
    ORDER BY session_date ASC
  `).all(userId, courseId, assignmentType).map((row) => row.session_date);
}

function validateSchedulesForCourses(db, schedules, courseIds) {
  const result = {};

  for (const courseId of courseIds) {
    const durationDays = getCourseDurationDays(db, courseId);
    const dates = schedules?.[courseId] ?? schedules?.[String(courseId)] ?? [];
    const check = validateSessionDates(dates, durationDays);
    if (!check.ok) {
      const course = db.prepare('SELECT title FROM courses WHERE id = ?').get(courseId);
      return {
        ok: false,
        error: `${course?.title || 'Formation'} : ${check.error}`,
      };
    }
    result[courseId] = check.dates;
  }

  return { ok: true, schedules: result };
}

function defaultDurationForLevel(level) {
  switch (level) {
    case 'fundamentals': return 2;
    case 'associate': return 4;
    case 'expert': return 5;
    case 'specialty': return 3;
    default: return 1;
  }
}

function hasCompleteSchedule(db, userId, courseId, assignmentType) {
  const durationDays = getCourseDurationDays(db, courseId);
  const row = db.prepare(`
    SELECT COUNT(*) AS n
    FROM assignment_session_dates
    WHERE user_id = ? AND course_id = ? AND assignment_type = ?
  `).get(userId, courseId, assignmentType);
  return (row?.n || 0) === durationDays;
}

function cleanupIncompleteAssignments(db) {
  const incomplete = db.prepare(`
    SELECT ia.user_id, ia.course_id
    FROM instructor_assignments ia
    LEFT JOIN (
      SELECT user_id, course_id, COUNT(*) AS n
      FROM assignment_session_dates
      WHERE assignment_type = 'teaching'
      GROUP BY user_id, course_id
    ) sd ON sd.user_id = ia.user_id AND sd.course_id = ia.course_id
    WHERE COALESCE(sd.n, 0) = 0
  `).all();

  for (const row of incomplete) {
    deleteSessionDates(db, row.user_id, row.course_id, 'teaching');
    db.prepare('DELETE FROM instructor_assignments WHERE user_id = ? AND course_id = ?')
      .run(row.user_id, row.course_id);
  }

  const incompleteEnrollments = db.prepare(`
    SELECT e.user_id, e.course_id
    FROM enrollments e
    LEFT JOIN (
      SELECT user_id, course_id, COUNT(*) AS n
      FROM assignment_session_dates
      WHERE assignment_type = 'enrollment'
      GROUP BY user_id, course_id
    ) sd ON sd.user_id = e.user_id AND sd.course_id = e.course_id
    WHERE COALESCE(sd.n, 0) = 0
  `).all();

  for (const row of incompleteEnrollments) {
    deleteSessionDates(db, row.user_id, row.course_id, 'enrollment');
    db.prepare('DELETE FROM enrollments WHERE user_id = ? AND course_id = ?')
      .run(row.user_id, row.course_id);
  }
}

module.exports = {
  normalizeSessionDates,
  validateSessionDates,
  validateTeachingAssignmentDates,
  validateSchedulesForCourses,
  getCourseDurationDays,
  getOtherInstructorsSessionDates,
  getReplacementRequestedDates,
  getReplacementDatesForInstructor,
  setReplacementDatesForInstructor,
  saveSessionDates,
  deleteSessionDates,
  deleteAllSessionDatesForUser,
  getSessionDates,
  hasCompleteSchedule,
  cleanupIncompleteAssignments,
  defaultDurationForLevel,
};
