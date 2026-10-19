const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'lms.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

function initDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);

  migrate(db);
  require('./seed').seedAdmin(db);
  require('./seed-microsoft').seedMicrosoftCourses(db);

  return db;
}

function migrate(db) {
  const materialColumns = db.prepare('PRAGMA table_info(course_materials)').all().map((c) => c.name);
  const materialAdditions = [
    ['file_path', 'TEXT DEFAULT ""'],
    ['original_filename', 'TEXT DEFAULT ""'],
    ['mime_type', 'TEXT DEFAULT ""'],
    ['file_size', 'INTEGER DEFAULT 0'],
  ];

  for (const [name, definition] of materialAdditions) {
    if (!materialColumns.includes(name)) {
      db.exec(`ALTER TABLE course_materials ADD COLUMN ${name} ${definition}`);
    }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS material_sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'videos' CHECK (type IN ('slides', 'videos', 'docs', 'labs')),
      title TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const hasVideoSections = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='video_sections'"
  ).get();
  const hasMaterialSections = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='material_sections'"
  ).get();

  if (hasVideoSections && !hasMaterialSections) {
    db.exec('ALTER TABLE video_sections RENAME TO material_sections');
  }

  const sectionColumns = db.prepare('PRAGMA table_info(material_sections)').all().map((c) => c.name);
  if (sectionColumns.length && !sectionColumns.includes('type')) {
    db.exec("ALTER TABLE material_sections ADD COLUMN type TEXT NOT NULL DEFAULT 'videos'");
  }
  if (sectionColumns.length && !sectionColumns.includes('description')) {
    db.exec('ALTER TABLE material_sections ADD COLUMN description TEXT DEFAULT ""');
  }

  db.exec('CREATE INDEX IF NOT EXISTS idx_material_sections_course ON material_sections(course_id, type)');

  if (!materialColumns.includes('section_id')) {
    db.exec('ALTER TABLE course_materials ADD COLUMN section_id INTEGER REFERENCES material_sections(id) ON DELETE SET NULL');
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_materials_section ON course_materials(section_id)');

  db.exec(`
    CREATE TABLE IF NOT EXISTS material_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      material_id INTEGER NOT NULL REFERENCES course_materials(id) ON DELETE CASCADE,
      viewed_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (user_id, material_id)
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_material_views_user ON material_views(user_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_material_views_material ON material_views(material_id)');

  const userColumns = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
  if (!userColumns.includes('approved')) {
    db.exec('ALTER TABLE users ADD COLUMN approved INTEGER NOT NULL DEFAULT 1');
    db.exec("UPDATE users SET approved = 1 WHERE role IN ('learner', 'admin', 'instructor')");
  }
  if (!userColumns.includes('avatar_mode')) {
    db.exec("ALTER TABLE users ADD COLUMN avatar_mode TEXT NOT NULL DEFAULT 'auto'");
  }
  if (!userColumns.includes('avatar_generic_id')) {
    db.exec('ALTER TABLE users ADD COLUMN avatar_generic_id INTEGER NOT NULL DEFAULT 0');
  }
  if (!userColumns.includes('gravatar_available')) {
    db.exec('ALTER TABLE users ADD COLUMN gravatar_available INTEGER');
  }
  if (!userColumns.includes('avatar_filename')) {
    db.exec("ALTER TABLE users ADD COLUMN avatar_filename TEXT NOT NULL DEFAULT ''");
  }
  if (!userColumns.includes('profile_bio')) {
    db.exec("ALTER TABLE users ADD COLUMN profile_bio TEXT NOT NULL DEFAULT ''");
  }

  // Allow avatar_mode = 'upload' on DBs created with the older CHECK constraint.
  // Also recover if a previous run left users_avatar_mig behind after a crash.
  const orphanAvatarMig = db.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users_avatar_mig'"
  ).get();
  if (orphanAvatarMig) {
    const usersStillPresent = db.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'"
    ).get();
    if (usersStillPresent) {
      db.exec('DROP TABLE IF EXISTS users_avatar_mig');
    } else {
      db.exec('ALTER TABLE users_avatar_mig RENAME TO users');
    }
  }

  const usersTableSql = db.prepare(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'"
  ).get()?.sql || '';
  if (
    usersTableSql.includes('avatar_mode')
    && usersTableSql.includes("IN ('auto', 'gravatar', 'generic')")
    && !usersTableSql.includes("'upload'")
  ) {
    // Child tables reference users — must disable FK checks for the rebuild.
    db.pragma('foreign_keys = OFF');
    db.exec('BEGIN');
    try {
      db.exec('DROP TABLE IF EXISTS users_avatar_mig');
      db.exec(`
        CREATE TABLE users_avatar_mig (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'learner' CHECK (role IN ('learner', 'instructor', 'admin')),
          approved INTEGER NOT NULL DEFAULT 1,
          is_instructor INTEGER NOT NULL DEFAULT 0,
          avatar_mode TEXT NOT NULL DEFAULT 'auto' CHECK (avatar_mode IN ('auto', 'gravatar', 'generic', 'upload')),
          avatar_generic_id INTEGER NOT NULL DEFAULT 0,
          gravatar_available INTEGER,
          avatar_filename TEXT NOT NULL DEFAULT '',
          profile_bio TEXT NOT NULL DEFAULT '',
          company TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        INSERT INTO users_avatar_mig (
          id, email, password_hash, name, role, approved, is_instructor,
          avatar_mode, avatar_generic_id, gravatar_available, avatar_filename,
          profile_bio, company, created_at
        )
        SELECT
          id, email, password_hash, name, role, approved, is_instructor,
          avatar_mode, avatar_generic_id, gravatar_available,
          COALESCE(avatar_filename, ''),
          COALESCE(profile_bio, ''), COALESCE(company, ''), created_at
        FROM users;
        DROP TABLE users;
        ALTER TABLE users_avatar_mig RENAME TO users;
      `);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    } finally {
      db.pragma('foreign_keys = ON');
    }
  }

  const courseColumns = db.prepare('PRAGMA table_info(courses)').all().map((c) => c.name);
  if (!courseColumns.includes('subject')) {
    db.exec("ALTER TABLE courses ADD COLUMN subject TEXT NOT NULL DEFAULT 'developpement'");
  }
  if (!courseColumns.includes('subsection')) {
    db.exec("ALTER TABLE courses ADD COLUMN subsection TEXT NOT NULL DEFAULT ''");
  }
  if (!courseColumns.includes('exam_code')) {
    db.exec("ALTER TABLE courses ADD COLUMN exam_code TEXT NOT NULL DEFAULT ''");
  }
  if (!courseColumns.includes('is_catalog')) {
    db.exec('ALTER TABLE courses ADD COLUMN is_catalog INTEGER NOT NULL DEFAULT 0');
    db.exec("UPDATE courses SET is_catalog = 1 WHERE exam_code != ''");
  }
  if (!courseColumns.includes('duration_days')) {
    db.exec('ALTER TABLE courses ADD COLUMN duration_days INTEGER NOT NULL DEFAULT 1');
    db.exec(`
      UPDATE courses SET duration_days = CASE
        WHEN subject = 'microsoft' AND subsection = 'fundamentals' THEN 2
        WHEN subject = 'microsoft' AND subsection IN ('infrastructure', 'data-ai', 'digital-app', 'modern-work', 'business-apps', 'security') THEN 4
        WHEN subject = 'microsoft' AND subsection = 'specialty' THEN 3
        ELSE 1
      END
    `);
  }
  if (!courseColumns.includes('evaluation_url')) {
    db.exec("ALTER TABLE courses ADD COLUMN evaluation_url TEXT NOT NULL DEFAULT 'https://forms.cloud.microsoft/e/RFjBKzfwQQ'");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS assignment_session_dates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      assignment_type TEXT NOT NULL CHECK (assignment_type IN ('enrollment', 'teaching')),
      session_date TEXT NOT NULL,
      UNIQUE (user_id, course_id, assignment_type, session_date)
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_session_dates_user ON assignment_session_dates(user_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_session_dates_course ON assignment_session_dates(course_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_session_dates_date ON assignment_session_dates(session_date)');

  db.exec(`
    CREATE TABLE IF NOT EXISTS teaching_replacement_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      session_date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (user_id, course_id, session_date)
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_replacement_course ON teaching_replacement_requests(course_id)');

  const sessionCount = db.prepare('SELECT COUNT(*) AS n FROM assignment_session_dates').get().n;
  if (sessionCount === 0) {
    db.exec(`
      INSERT OR IGNORE INTO assignment_session_dates (user_id, course_id, assignment_type, session_date)
      SELECT e.user_id, e.course_id, 'enrollment', date(e.enrolled_at)
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      WHERE (
        SELECT COUNT(*) FROM assignment_session_dates sd
        WHERE sd.user_id = e.user_id AND sd.course_id = e.course_id AND sd.assignment_type = 'enrollment'
      ) = 0
    `);
  }

  const { cleanupIncompleteAssignments } = require('../lib/schedule');
  cleanupIncompleteAssignments(db);
  db.exec('CREATE INDEX IF NOT EXISTS idx_courses_subject ON courses(subject)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_courses_subsection ON courses(subject, subsection)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_courses_exam_code ON courses(subject, exam_code)');

  const userColumnsAfter = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
  if (!userColumnsAfter.includes('is_instructor')) {
    db.exec('ALTER TABLE users ADD COLUMN is_instructor INTEGER NOT NULL DEFAULT 0');
    db.exec("UPDATE users SET is_instructor = 1 WHERE role = 'instructor' AND approved = 1");
    db.exec("UPDATE users SET is_instructor = 1 WHERE role = 'admin'");
  }
  if (!userColumnsAfter.includes('company')) {
    db.exec("ALTER TABLE users ADD COLUMN company TEXT NOT NULL DEFAULT ''");
  }

  // Cleanup accounts created from polluted .env (email containing spaces / KEY=VALUE)
  const polluted = db.prepare(`
    SELECT id, email FROM users
    WHERE email LIKE '% %' OR email LIKE '%=%'
  `).all();
  for (const row of polluted) {
    const refs = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM enrollments WHERE user_id = ?) +
        (SELECT COUNT(*) FROM courses WHERE instructor_id = ?) +
        (SELECT COUNT(*) FROM instructor_assignments WHERE user_id = ?) AS n
    `).get(row.id, row.id, row.id).n;
    if (refs === 0) {
      db.prepare('DELETE FROM users WHERE id = ?').run(row.id);
      console.warn(`[db] Compte pollué sans références supprimé (id=${row.id})`);
      continue;
    }
    const extracted = String(row.email).match(/[^\s=]+@[^\s=]+\.[^\s=]+/);
    let repaired = extracted ? extracted[0].toLowerCase() : `invalid-${row.id}@invalid.local`;
    const taken = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(repaired, row.id);
    if (taken) repaired = `invalid-${row.id}@invalid.local`;
    db.prepare('UPDATE users SET email = ? WHERE id = ?').run(repaired, row.id);
    console.warn(`[db] Email pollué réparé pour l'utilisateur id=${row.id}`);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS instructor_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (user_id, course_id)
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_instructor_assignments_user ON instructor_assignments(user_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_instructor_assignments_course ON instructor_assignments(course_id)');

  fixMaterialSectionForeignKey(db);
  migrateSessionsAndAccessAnalytics(db);
}

function migrateSessionsAndAccessAnalytics(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS course_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS course_session_dates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES course_sessions(id) ON DELETE CASCADE,
      session_date TEXT NOT NULL,
      UNIQUE (session_id, session_date)
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS session_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES course_sessions(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'learner' CHECK (role IN ('learner', 'instructor')),
      enrolled_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (session_id, user_id)
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_course_sessions_course ON course_sessions(course_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_course_session_dates_session ON course_session_dates(session_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_course_session_dates_date ON course_session_dates(session_date)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_session_participants_user ON session_participants(user_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_session_participants_session ON session_participants(session_id)');

  db.exec(`
    CREATE TABLE IF NOT EXISTS material_view_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      material_id INTEGER NOT NULL REFERENCES course_materials(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      source TEXT NOT NULL DEFAULT 'view',
      viewed_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_material_view_events_user ON material_view_events(user_id, viewed_at)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_material_view_events_course ON material_view_events(course_id, viewed_at)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_material_view_events_material ON material_view_events(material_id)');

  const viewColumns = db.prepare('PRAGMA table_info(material_views)').all().map((c) => c.name);
  if (viewColumns.length && !viewColumns.includes('view_count')) {
    db.exec('ALTER TABLE material_views ADD COLUMN view_count INTEGER NOT NULL DEFAULT 1');
  }
  if (viewColumns.length && !viewColumns.includes('first_viewed_at')) {
    db.exec('ALTER TABLE material_views ADD COLUMN first_viewed_at TEXT');
    db.exec(`
      UPDATE material_views
      SET first_viewed_at = COALESCE(NULLIF(viewed_at, ''), datetime('now'))
      WHERE first_viewed_at IS NULL OR first_viewed_at = ''
    `);
  }

  // Seed historical events from existing material_views (once)
  const eventCount = db.prepare('SELECT COUNT(*) AS n FROM material_view_events').get().n;
  if (eventCount === 0) {
    db.exec(`
      INSERT INTO material_view_events (user_id, material_id, course_id, source, viewed_at)
      SELECT mv.user_id, mv.material_id, cm.course_id, 'legacy', COALESCE(mv.viewed_at, datetime('now'))
      FROM material_views mv
      JOIN course_materials cm ON cm.id = mv.material_id
    `);
  }

  const { migrateLegacyEnrollmentsToSessions } = require('../lib/sessions');
  migrateLegacyEnrollmentsToSessions(db);
}

function fixMaterialSectionForeignKey(db) {
  const fks = db.prepare('PRAGMA foreign_key_list(course_materials)').all();
  const badSectionFk = fks.some((fk) => fk.from === 'section_id' && fk.table === 'video_sections');
  if (!badSectionFk) return;

  const hasVideoSections = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='video_sections'"
  ).get();

  if (hasVideoSections) {
    const legacySections = db.prepare(
      'SELECT id, course_id, title, order_index, created_at FROM video_sections'
    ).all();
    for (const row of legacySections) {
      db.prepare(`
        INSERT OR IGNORE INTO material_sections (id, course_id, type, title, order_index, created_at)
        VALUES (?, ?, 'videos', ?, ?, ?)
      `).run(row.id, row.course_id, row.title, row.order_index, row.created_at);
    }
  }

  db.pragma('foreign_keys = OFF');
  db.exec('BEGIN');
  try {
    db.exec(`
      CREATE TABLE course_materials_fk_fix (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('slides', 'videos', 'docs', 'labs')),
        section_id INTEGER REFERENCES material_sections(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        url TEXT DEFAULT '',
        file_path TEXT DEFAULT '',
        original_filename TEXT DEFAULT '',
        mime_type TEXT DEFAULT '',
        file_size INTEGER DEFAULT 0,
        order_index INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.exec(`
      INSERT INTO course_materials_fk_fix (
        id, course_id, type, section_id, title, description, url,
        file_path, original_filename, mime_type, file_size, order_index, created_at
      )
      SELECT
        id, course_id, type, section_id, title, description, url,
        file_path, original_filename, mime_type, file_size, order_index, created_at
      FROM course_materials
    `);
    db.exec('DROP TABLE course_materials');
    db.exec('ALTER TABLE course_materials_fk_fix RENAME TO course_materials');
    db.exec('CREATE INDEX IF NOT EXISTS idx_materials_course ON course_materials(course_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_materials_type ON course_materials(course_id, type)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_materials_section ON course_materials(section_id)');
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  } finally {
    db.pragma('foreign_keys = ON');
  }

  if (hasVideoSections) {
    db.exec('DROP TABLE IF EXISTS video_sections');
  }
}

module.exports = { initDatabase, DB_PATH, migrate };
