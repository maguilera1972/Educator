function recordMaterialViewEvent(db, { userId, materialId, courseId, source = 'view' }) {
  db.prepare(`
    INSERT INTO material_view_events (user_id, material_id, course_id, source)
    VALUES (?, ?, ?, ?)
  `).run(userId, materialId, courseId, source);

  db.prepare(`
    INSERT INTO material_views (user_id, material_id, view_count, first_viewed_at, viewed_at)
    VALUES (?, ?, 1, datetime('now'), datetime('now'))
    ON CONFLICT(user_id, material_id) DO UPDATE SET
      viewed_at = datetime('now'),
      view_count = material_views.view_count + 1
  `).run(userId, materialId);
}

function getParticipantAccessStats(db, userId, courseId = null) {
  const courseFilter = courseId ? 'AND e.course_id = ?' : '';
  const courseParams = courseId ? [userId, courseId] : [userId];

  const courses = db.prepare(`
    SELECT
      c.id AS course_id,
      c.title,
      c.subject,
      e.enrolled_at,
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
      ) AS session_end,
      (SELECT COUNT(*) FROM material_view_events mve
        WHERE mve.user_id = e.user_id AND mve.course_id = c.id) AS total_views,
      (SELECT COUNT(DISTINCT mve.material_id) FROM material_view_events mve
        WHERE mve.user_id = e.user_id AND mve.course_id = c.id) AS unique_materials,
      (SELECT COUNT(*) FROM material_view_events mve
        WHERE mve.user_id = e.user_id AND mve.course_id = c.id
          AND date(mve.viewed_at) <= COALESCE(
            (SELECT MAX(d.session_date)
               FROM session_participants sp
               JOIN course_sessions s ON s.id = sp.session_id
               JOIN course_session_dates d ON d.session_id = s.id
              WHERE sp.user_id = e.user_id AND s.course_id = c.id AND sp.role = 'learner'),
            date(e.enrolled_at)
          )
      ) AS views_during,
      (SELECT COUNT(*) FROM material_view_events mve
        WHERE mve.user_id = e.user_id AND mve.course_id = c.id
          AND date(mve.viewed_at) > COALESCE(
            (SELECT MAX(d.session_date)
               FROM session_participants sp
               JOIN course_sessions s ON s.id = sp.session_id
               JOIN course_session_dates d ON d.session_id = s.id
              WHERE sp.user_id = e.user_id AND s.course_id = c.id AND sp.role = 'learner'),
            date(e.enrolled_at)
          )
      ) AS views_after,
      (SELECT MAX(mve.viewed_at) FROM material_view_events mve
        WHERE mve.user_id = e.user_id AND mve.course_id = c.id) AS last_access_at
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    WHERE e.user_id = ?
      ${courseFilter}
    ORDER BY c.title ASC
  `).all(...courseParams);

  const dailyParams = courseId ? [userId, courseId] : [userId];
  const daily = db.prepare(`
    SELECT date(mve.viewed_at) AS day, mve.course_id, COUNT(*) AS views
    FROM material_view_events mve
    JOIN enrollments e ON e.user_id = mve.user_id AND e.course_id = mve.course_id
    WHERE mve.user_id = ?
      ${courseId ? 'AND mve.course_id = ?' : ''}
    GROUP BY date(mve.viewed_at), mve.course_id
    ORDER BY day DESC
    LIMIT 90
  `).all(...dailyParams);

  return {
    user_id: Number(userId),
    courses,
    daily,
    totals: {
      total_views: courses.reduce((sum, c) => sum + (c.total_views || 0), 0),
      views_during: courses.reduce((sum, c) => sum + (c.views_during || 0), 0),
      views_after: courses.reduce((sum, c) => sum + (c.views_after || 0), 0),
      courses_followed: courses.length,
    },
  };
}

function getCourseAccessStats(db, courseId) {
  const participants = db.prepare(`
    SELECT
      u.id AS user_id,
      u.name,
      u.email,
      e.enrolled_at,
      (SELECT MIN(d.session_date)
         FROM session_participants sp
         JOIN course_sessions s ON s.id = sp.session_id
         JOIN course_session_dates d ON d.session_id = s.id
        WHERE sp.user_id = u.id AND s.course_id = e.course_id AND sp.role = 'learner'
      ) AS session_start,
      (SELECT MAX(d.session_date)
         FROM session_participants sp
         JOIN course_sessions s ON s.id = sp.session_id
         JOIN course_session_dates d ON d.session_id = s.id
        WHERE sp.user_id = u.id AND s.course_id = e.course_id AND sp.role = 'learner'
      ) AS session_end,
      (SELECT COUNT(*) FROM material_view_events mve
        WHERE mve.user_id = u.id AND mve.course_id = e.course_id) AS total_views,
      (SELECT COUNT(DISTINCT mve.material_id) FROM material_view_events mve
        WHERE mve.user_id = u.id AND mve.course_id = e.course_id) AS unique_materials,
      (SELECT COUNT(*) FROM material_view_events mve
        WHERE mve.user_id = u.id AND mve.course_id = e.course_id
          AND date(mve.viewed_at) <= COALESCE(
            (SELECT MAX(d.session_date)
               FROM session_participants sp
               JOIN course_sessions s ON s.id = sp.session_id
               JOIN course_session_dates d ON d.session_id = s.id
              WHERE sp.user_id = u.id AND s.course_id = e.course_id AND sp.role = 'learner'),
            date(e.enrolled_at)
          )
      ) AS views_during,
      (SELECT COUNT(*) FROM material_view_events mve
        WHERE mve.user_id = u.id AND mve.course_id = e.course_id
          AND date(mve.viewed_at) > COALESCE(
            (SELECT MAX(d.session_date)
               FROM session_participants sp
               JOIN course_sessions s ON s.id = sp.session_id
               JOIN course_session_dates d ON d.session_id = s.id
              WHERE sp.user_id = u.id AND s.course_id = e.course_id AND sp.role = 'learner'),
            date(e.enrolled_at)
          )
      ) AS views_after,
      (SELECT MAX(mve.viewed_at) FROM material_view_events mve
        WHERE mve.user_id = u.id AND mve.course_id = e.course_id) AS last_access_at
    FROM enrollments e
    JOIN users u ON u.id = e.user_id
    WHERE e.course_id = ?
    ORDER BY u.name ASC
  `).all(courseId);

  return {
    course_id: Number(courseId),
    participants,
    totals: {
      participants: participants.length,
      total_views: participants.reduce((sum, p) => sum + (p.total_views || 0), 0),
      views_during: participants.reduce((sum, p) => sum + (p.views_during || 0), 0),
      views_after: participants.reduce((sum, p) => sum + (p.views_after || 0), 0),
    },
  };
}

module.exports = {
  recordMaterialViewEvent,
  getParticipantAccessStats,
  getCourseAccessStats,
};
