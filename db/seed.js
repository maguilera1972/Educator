const bcrypt = require('bcryptjs');

const DEFAULT_ADMIN = {
  email: 'michel.aguilera@also.com',
  name: 'Michel Aguilera',
};

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

/**
 * Ensure a single LMS administrator (Michel) and demote any other admin accounts.
 */
function seedAdmin(db) {
  let email = (process.env.ADMIN_EMAIL || DEFAULT_ADMIN.email).trim().toLowerCase();
  let name = String(process.env.ADMIN_NAME || DEFAULT_ADMIN.name).trim();
  const passwordFromEnv = process.env.ADMIN_PASSWORD;
  const password = passwordFromEnv || 'ChangeMeNow!';

  // Guard against polluted .env values (several KEY=VALUE on one line)
  if (!isValidEmail(email) || /\s|=/.test(email)) {
    console.warn(`[seed] Invalid ADMIN_EMAIL — fallback ${DEFAULT_ADMIN.email}`);
    email = DEFAULT_ADMIN.email;
  }
  if (!name || /=/.test(name) || name.length > 80) {
    name = DEFAULT_ADMIN.name;
  }

  const existing = db.prepare('SELECT id, role FROM users WHERE email = ?').get(email);

  if (existing) {
    db.prepare(
      "UPDATE users SET role = 'admin', approved = 1, is_instructor = 1, name = ? WHERE id = ?"
    ).run(name, existing.id);
    if (passwordFromEnv) {
      const hash = bcrypt.hashSync(password, 10);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, existing.id);
    }
  } else {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare(
      'INSERT INTO users (email, password_hash, name, role, approved, is_instructor) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(email, hash, name, 'admin', 1, 1);

    if (!passwordFromEnv) {
      console.warn('[seed] ADMIN_PASSWORD not set — temporary initial password ChangeMeNow! (change immediately)');
    }
    console.log(`Initial administrator created: ${email}`);
  }

  // Sole admin: demote every other admin account
  const demoted = db.prepare(
    "UPDATE users SET role = 'learner', is_instructor = 0 WHERE role = 'admin' AND lower(email) != ?"
  ).run(email);
  if (demoted.changes > 0) {
    console.log(`[seed] Demoted ${demoted.changes} other admin account(s); sole admin is ${email}`);
  }
}

module.exports = { seedAdmin };
