const {
  MICROSOFT_COURSES,
  formatMicrosoftCourseTitle,
} = require('../lib/microsoft-catalog');
const { defaultDurationForLevel } = require('../lib/schedule');

function getAdminInstructorId(db) {
  const admin = db.prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1").get();
  return admin?.id || 1;
}

function seedMicrosoftCourses(db) {
  const instructorId = getAdminInstructorId(db);
  const insert = db.prepare(`
    INSERT INTO courses (title, description, subject, subsection, exam_code, instructor_id, is_catalog, duration_days)
    VALUES (?, ?, 'microsoft', ?, ?, ?, 1, ?)
  `);
  const exists = db.prepare(
    "SELECT id FROM courses WHERE subject = 'microsoft' AND exam_code = ?"
  );
  const updateDuration = db.prepare(
    "UPDATE courses SET duration_days = ? WHERE subject = 'microsoft' AND exam_code = ? AND duration_days = 1"
  );

  let created = 0;
  for (const course of MICROSOFT_COURSES) {
    const durationDays = defaultDurationForLevel(course.level);
    if (exists.get(course.exam_code)) {
      updateDuration.run(durationDays, course.exam_code);
      continue;
    }
    insert.run(
      formatMicrosoftCourseTitle(course.exam_code, course.title),
      course.description,
      course.subsection,
      course.exam_code,
      instructorId,
      durationDays
    );
    created += 1;
  }

  if (created > 0) {
    console.log(`Catalogue Microsoft : ${created} cours créés.`);
  }
}

module.exports = { seedMicrosoftCourses };
