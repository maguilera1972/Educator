const fs = require('fs');
const path = require('path');

function parseEnvAssignments(text) {
  const assignments = [];
  const lines = String(text || '').split(/\r?\n/);

  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    // Support several KEY=VALUE pairs on one line (legacy broken .env format)
    while (line) {
      const eq = line.indexOf('=');
      if (eq === -1) break;

      const key = line.slice(0, eq).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) break;

      let rest = line.slice(eq + 1).trim();
      let value = '';

      if ((rest.startsWith('"') && rest.indexOf('"', 1) !== -1)
        || (rest.startsWith("'") && rest.indexOf("'", 1) !== -1)) {
        const quote = rest[0];
        const end = rest.indexOf(quote, 1);
        value = rest.slice(1, end);
        line = rest.slice(end + 1).trim();
      } else {
        // Unquoted value: stop before the next KEY= token
        const next = rest.search(/\s+[A-Za-z_][A-Za-z0-9_]*=/);
        if (next === -1) {
          value = rest;
          line = '';
        } else {
          value = rest.slice(0, next).trim();
          line = rest.slice(next).trim();
        }
      }

      assignments.push({ key, value });
    }
  }

  return assignments;
}

function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;

  // Always apply values from .env so we correct polluted systemd EnvironmentFile
  // parsing when several KEY=VALUE pairs were put on the same line.
  for (const { key, value } of parseEnvAssignments(fs.readFileSync(envPath, 'utf8'))) {
    process.env[key] = value;
  }
}

module.exports = { loadEnvFile, parseEnvAssignments };
