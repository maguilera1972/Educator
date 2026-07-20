const express = require('express');
const { authRequired } = require('../middleware/auth');
const { getSubjectLabel } = require('../lib/subjects');
const { isActiveInstructor } = require('../lib/users');

module.exports = function createCalendarRouter(db) {
  const router = express.Router();

  router.get('/', authRequired, (req, res) => {
    try {
      const courses = [];
      const seen = new Set();
      const userId = req.user.id;

      const enrolled = db.prepare(`
        SELECT c.id, c.title, c.subject, sd.session_date AS event_date, 'enrolled' AS relation
        FROM enrollments e
        JOIN courses c ON c.id = e.course_id
        JOIN assignment_session_dates sd
          ON sd.user_id = e.user_id
          AND sd.course_id = e.course_id
          AND sd.assignment_type = 'enrollment'
        WHERE e.user_id = ?
        ORDER BY sd.session_date ASC, c.title ASC
      `).all(userId);

      for (const row of enrolled) {
        const eventDate = row.event_date ? String(row.event_date).slice(0, 10) : null;
        if (!eventDate) continue;
        const key = `${row.id}-${eventDate}-enrolled`;
        if (seen.has(key)) continue;
        seen.add(key);
        courses.push({
          id: row.id,
          title: row.title,
          subject: row.subject,
          subject_label: getSubjectLabel(row.subject) || row.subject || '',
          event_date: eventDate,
          relation: row.relation,
          accessible: true,
          url: `/course.html?id=${row.id}`,
        });
      }

      if (req.user.role === 'admin' || isActiveInstructor(req.user, db)) {
        const teaching = db.prepare(`
          SELECT c.id, c.title, c.subject, sd.session_date AS event_date, 'teaching' AS relation
          FROM instructor_assignments ia
          JOIN courses c ON c.id = ia.course_id
          JOIN assignment_session_dates sd
            ON sd.user_id = ia.user_id
            AND sd.course_id = ia.course_id
            AND sd.assignment_type = 'teaching'
          WHERE ia.user_id = ?
          ORDER BY sd.session_date ASC, c.title ASC
        `).all(userId);

        for (const row of teaching) {
          const eventDate = row.event_date ? String(row.event_date).slice(0, 10) : null;
          if (!eventDate) continue;
          const duplicate = courses.some(
            (c) => c.id === row.id && c.event_date === eventDate
          );
          if (duplicate) continue;
          const key = `${row.id}-${eventDate}-teaching`;
          if (seen.has(key)) continue;
          seen.add(key);
          courses.push({
            id: row.id,
            title: row.title,
            subject: row.subject,
            subject_label: getSubjectLabel(row.subject) || row.subject || '',
            event_date: eventDate,
            relation: row.relation,
            accessible: true,
            url: `/course.html?id=${row.id}`,
          });
        }
      }

      // Permanent library: all enrolled / teaching courses, regardless of session dates
      let library = [];
      try {
        library = db.prepare(`
          SELECT
            c.id,
            c.title,
            c.subject,
            'enrolled' AS relation,
            e.enrolled_at,
            (SELECT MIN(d.session_date)
               FROM session_participants sp
               JOIN course_sessions s ON s.id = sp.session_id
               JOIN course_session_dates d ON d.session_id = s.id
              WHERE sp.user_id = e.user_id AND s.course_id = c.id AND sp.role = 'learner'
            ) AS starts_on,
            (SELECT MAX(d.session_date)
               FROM session_participants sp
               JOIN course_sessions s ON s.id = sp.session_id
               JOIN course_session_dates d ON d.session_id = s.id
              WHERE sp.user_id = e.user_id AND s.course_id = c.id AND sp.role = 'learner'
            ) AS ends_on
          FROM enrollments e
          JOIN courses c ON c.id = e.course_id
          WHERE e.user_id = ?
          ORDER BY c.title ASC
        `).all(userId).map((row) => {
          const today = new Date().toISOString().slice(0, 10);
          let status = 'available';
          if (row.starts_on && row.ends_on) {
            if (today < row.starts_on) status = 'upcoming';
            else if (today > row.ends_on) status = 'completed';
            else status = 'active';
          }
          return {
            id: row.id,
            title: row.title,
            subject: row.subject,
            subject_label: getSubjectLabel(row.subject) || row.subject || '',
            relation: row.relation,
            accessible: true,
            permanent_access: true,
            status,
            starts_on: row.starts_on || null,
            ends_on: row.ends_on || null,
            enrolled_at: row.enrolled_at,
            url: `/course.html?id=${row.id}`,
          };
        });
      } catch (libraryErr) {
        console.error('[calendar] library query:', libraryErr.message);
        // Fallback without session tables
        library = db.prepare(`
          SELECT c.id, c.title, c.subject, e.enrolled_at
          FROM enrollments e
          JOIN courses c ON c.id = e.course_id
          WHERE e.user_id = ?
          ORDER BY c.title ASC
        `).all(userId).map((row) => ({
          id: row.id,
          title: row.title,
          subject: row.subject,
          subject_label: getSubjectLabel(row.subject) || row.subject || '',
          relation: 'enrolled',
          accessible: true,
          permanent_access: true,
          status: 'available',
          starts_on: null,
          ends_on: null,
          enrolled_at: row.enrolled_at,
          url: `/course.html?id=${row.id}`,
        }));
      }

      if (req.user.role === 'admin' || isActiveInstructor(req.user, db)) {
        const teachingLibrary = db.prepare(`
          SELECT c.id, c.title, c.subject, ia.assigned_at AS enrolled_at
          FROM instructor_assignments ia
          JOIN courses c ON c.id = ia.course_id
          WHERE ia.user_id = ?
          ORDER BY c.title ASC
        `).all(userId);

        for (const row of teachingLibrary) {
          if (library.some((c) => c.id === row.id)) continue;
          library.push({
            id: row.id,
            title: row.title,
            subject: row.subject,
            subject_label: getSubjectLabel(row.subject) || row.subject || '',
            relation: 'teaching',
            accessible: true,
            permanent_access: true,
            status: 'teaching',
            starts_on: null,
            ends_on: null,
            enrolled_at: row.enrolled_at,
            url: `/course.html?id=${row.id}`,
          });
        }
      }

      res.json({
        timezone: 'Europe/Zurich',
        timezone_label: 'Berne',
        courses,
        library,
      });
    } catch (err) {
      console.error('[calendar]', err);
      // Ne jamais casser la sidebar : renvoyer un calendrier vide
      res.json({
        timezone: 'Europe/Zurich',
        timezone_label: 'Berne',
        courses: [],
        library: [],
        warning: 'Calendrier partiellement indisponible',
      });
    }
  });

  return router;
};
