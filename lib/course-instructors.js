const { enrichPublicUser } = require('./users');

function getTeachingInstructorsForCourse(db, courseId) {
  const course = db.prepare('SELECT duration_days, instructor_id FROM courses WHERE id = ?').get(courseId);
  if (!course) return [];

  const rows = db.prepare(`
    SELECT ia.user_id AS id, ia.assigned_at,
      u.name, u.email, u.role, u.approved, u.is_instructor,
      u.avatar_mode, u.avatar_generic_id, u.gravatar_available,
      (SELECT COUNT(*) FROM assignment_session_dates sd
       WHERE sd.user_id = ia.user_id AND sd.course_id = ia.course_id
         AND sd.assignment_type = 'teaching') AS session_count
    FROM instructor_assignments ia
    JOIN users u ON u.id = ia.user_id
    WHERE ia.course_id = ?
    ORDER BY session_count DESC, ia.assigned_at ASC
  `).all(courseId);

  if (!rows.length) return [];

  const enriched = rows.map((row) => ({
    ...enrichPublicUser(row),
    session_count: row.session_count || 0,
    assigned_at: row.assigned_at,
  }));

  if (enriched.length === 1) {
    return enriched.map((instructor) => ({ ...instructor, teaching_role: null }));
  }

  const maxSessions = enriched[0].session_count;
  let principalMarked = false;

  return enriched.map((instructor) => {
    if (!principalMarked && instructor.session_count === maxSessions && maxSessions > 0) {
      principalMarked = true;
      return { ...instructor, teaching_role: 'principal' };
    }
    return { ...instructor, teaching_role: 'substitute' };
  });
}

function attachTeachingInstructors(db, course) {
  if (!course?.id) return course;

  const instructors = getTeachingInstructorsForCourse(db, course.id);
  course.teaching_instructors = instructors;

  if (!instructors.length) return course;

  const labelParts = instructors.map((instructor) => {
    if (instructor.teaching_role === 'principal') return `${instructor.name} (principal)`;
    if (instructor.teaching_role === 'substitute') return `${instructor.name} (substitute)`;
    return instructor.name;
  });

  course.instructor_names = labelParts;
  course.instructor_name = labelParts.join(' · ');

  const lead = instructors.find((i) => i.teaching_role === 'principal') || instructors[0];
  course.instructor_avatar_url = lead.avatar_url;
  course.instructor_avatar_fallback = lead.gravatar_fallback || lead.avatar_url;

  return course;
}

module.exports = {
  getTeachingInstructorsForCourse,
  attachTeachingInstructors,
};
