const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SECRET_FILE = path.join(DATA_DIR, 'jwt.secret');
const DEFAULT_DEV_SECRET = 'lms-dev-secret-change-in-production';

function isWeakSecret(value) {
  if (!value) return true;
  const secret = String(value).trim();
  if (secret.length < 24) return true;
  if (secret === DEFAULT_DEV_SECRET) return true;
  if (secret.startsWith('<') && secret.endsWith('>')) return true;
  if (/remplacer|aleatoire|change-in-production|secret-fort|example|changeme/i.test(secret)) {
    return true;
  }
  return false;
}

function readPersistedSecret() {
  try {
    if (!fs.existsSync(SECRET_FILE)) return null;
    const secret = fs.readFileSync(SECRET_FILE, 'utf8').trim();
    return secret || null;
  } catch {
    return null;
  }
}

function persistSecret(secret) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(SECRET_FILE, `${secret}\n`, { mode: 0o600 });
}

/**
 * Resolve a stable JWT secret that survives VM reboots and .env placeholders.
 * Priority: persisted data/jwt.secret → strong JWT_SECRET from env → newly generated.
 */
function resolveJwtSecret() {
  const persisted = readPersistedSecret();
  if (persisted && !isWeakSecret(persisted)) {
    return persisted;
  }

  const fromEnv = process.env.JWT_SECRET;
  if (!isWeakSecret(fromEnv)) {
    persistSecret(fromEnv.trim());
    return fromEnv.trim();
  }

  // Keep an existing weak persisted secret only if present (avoid rotating on every boot
  // before the first strong secret is written). Prefer generating a strong one.
  const generated = crypto.randomBytes(48).toString('hex');
  persistSecret(generated);
  process.env.JWT_SECRET = generated;
  console.warn('[auth] Weak or missing JWT_SECRET — new persistent secret generated in data/jwt.secret');
  console.warn('[auth] Les sessions ouvertes doivent se reconnecter une fois.');
  return generated;
}

module.exports = {
  resolveJwtSecret,
  isWeakSecret,
  SECRET_FILE,
};
