const bcrypt = require('bcryptjs');

const DEFAULT_ADMIN = {
  email: 'admin@example.com',
  name: 'Administrator',
};

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function seedAdmin(db) {
  let email = (process.env.ADMIN_EMAIL || DEFAULT_ADMIN.email).trim().toLowerCase();
  let name = String(process.env.ADMIN_NAME || DEFAULT_ADMIN.name).trim();
  const passwordFromEnv = process.env.ADMIN_PASSWORD;
  const password = passwordFromEnv || 'ChangeMeNow!';

  // Guard against polluted .env values (several KEY=VALUE on one line)
  if (!isValidEmail(email) || /\s|=/.test(email)) {
    console.warn(`[seed] ADMIN_EMAIL invalide (« ${email.slice(0, 40)}… ») — fallback ${DEFAULT_ADMIN.email}`);
    email = DEFAULT_ADMIN.email;
  }
  if (!name || /=/.test(name) || name.length > 80) {
    name = DEFAULT_ADMIN.name;
  }

  const existing = db.prepare('SELECT id, role FROM users WHERE email = ?').get(email);

  if (existing) {
    db.prepare(
      "UPDATE users SET role = 'admin', approved = 1, is_instructor = 1 WHERE id = ?"
    ).run(existing.id);
    if (passwordFromEnv) {
      const hash = bcrypt.hashSync(password, 10);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, existing.id);
    }
    return;
  }

  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    'INSERT INTO users (email, password_hash, name, role, approved, is_instructor) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(email, hash, name, 'admin', 1, 1);

  if (!passwordFromEnv) {
    console.warn('[seed] ADMIN_PASSWORD non défini — mot de passe initial temporaire : ChangeMeNow! (à changer immédiatement)');
  }
  console.log(`Administrator initial créé : ${email}`);
}

module.exports = { seedAdmin };
