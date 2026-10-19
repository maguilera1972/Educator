const fs = require('fs');
const path = require('path');
const { isMailConfigured } = require('./mail');

const SETTINGS_FILE = path.join(__dirname, '..', 'data', 'mail-settings.json');

function ensureDataDir() {
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readSettingsFile() {
  if (!fs.existsSync(SETTINGS_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  } catch (err) {
    console.error('[mail-settings] Fichier illisible:', err.message);
    return null;
  }
}

function applySettingsToEnv(settings) {
  if (!settings || typeof settings !== 'object') return;
  if (settings.enabled !== undefined) process.env.MAIL_ENABLED = settings.enabled ? '1' : '0';
  if (settings.tenant_id !== undefined) process.env.AZURE_TENANT_ID = String(settings.tenant_id).trim();
  if (settings.client_id !== undefined) process.env.AZURE_CLIENT_ID = String(settings.client_id).trim();
  if (settings.client_secret) process.env.AZURE_CLIENT_SECRET = String(settings.client_secret).trim();
  if (settings.send_as !== undefined) process.env.MAIL_SEND_AS = String(settings.send_as).trim();
  if (settings.from !== undefined) process.env.MAIL_FROM = String(settings.from).trim();
  if (settings.from_name !== undefined) process.env.MAIL_FROM_NAME = String(settings.from_name).trim();
  if (settings.app_name !== undefined) process.env.MAIL_APP_NAME = String(settings.app_name).trim();
}

function maskSecret(secret) {
  if (!secret) return '';
  if (secret.length <= 4) return '****';
  return `${'*'.repeat(Math.min(secret.length - 4, 12))}${secret.slice(-4)}`;
}

function getCurrentSettingsFromEnv() {
  return {
    enabled: process.env.MAIL_ENABLED !== '0' && process.env.MAIL_ENABLED !== 'false',
    tenant_id: process.env.AZURE_TENANT_ID?.trim() || '',
    client_id: process.env.AZURE_CLIENT_ID?.trim() || '',
    client_secret: process.env.AZURE_CLIENT_SECRET?.trim() || '',
    send_as: process.env.MAIL_SEND_AS?.trim() || '',
    from: process.env.MAIL_FROM?.trim() || 'info@eureka-training.online',
    from_name: process.env.MAIL_FROM_NAME?.trim() || 'Eureka Training',
    app_name: process.env.MAIL_APP_NAME?.trim() || 'LMS-Educator',
  };
}

function initMailSettings() {
  const fileSettings = readSettingsFile();
  if (fileSettings) applySettingsToEnv(fileSettings);
}

function getMailSettingsForAdmin() {
  const current = getCurrentSettingsFromEnv();
  return {
    enabled: current.enabled,
    tenant_id: current.tenant_id,
    client_id: current.client_id,
    client_secret_set: !!current.client_secret,
    client_secret_hint: maskSecret(current.client_secret),
    send_as: current.send_as,
    from: current.from,
    from_name: current.from_name,
    app_name: current.app_name,
    configured: isMailConfigured(),
    provider: 'microsoft-graph',
    storage: fs.existsSync(SETTINGS_FILE) ? 'file' : 'env',
  };
}

function validateMailSettings(input, requireSecret) {
  if (!input.enabled) return { ok: true };
  const missing = [];
  if (!input.tenant_id?.trim()) missing.push('Tenant ID Azure');
  if (!input.client_id?.trim()) missing.push('Client ID Azure');
  if (requireSecret && !input.client_secret?.trim()) missing.push('Secret client Azure');
  if (!input.send_as?.trim()) missing.push("Mailbox");
  if (!input.from?.trim()) missing.push('From address');
  if (missing.length) return { ok: false, error: `Required fields: ${missing.join(', ')}` };
  return { ok: true };
}

function saveMailSettings(input) {
  const fileSettings = readSettingsFile() || {};
  const envSettings = getCurrentSettingsFromEnv();
  const clientSecretInput = String(input.client_secret || '').trim();
  const settings = {
    enabled: input.enabled === true || input.enabled === '1' || input.enabled === 1 || input.enabled === 'true',
    tenant_id: String(input.tenant_id ?? fileSettings.tenant_id ?? envSettings.tenant_id).trim(),
    client_id: String(input.client_id ?? fileSettings.client_id ?? envSettings.client_id).trim(),
    client_secret: clientSecretInput || fileSettings.client_secret || envSettings.client_secret || '',
    send_as: String(input.send_as ?? fileSettings.send_as ?? envSettings.send_as).trim(),
    from: String(input.from ?? fileSettings.from ?? envSettings.from).trim() || 'info@eureka-training.online',
    from_name: String(input.from_name ?? fileSettings.from_name ?? envSettings.from_name).trim() || 'Eureka Training',
    app_name: String(input.app_name ?? fileSettings.app_name ?? envSettings.app_name).trim() || 'LMS-Educator',
    updated_at: new Date().toISOString(),
  };
  const validation = validateMailSettings(settings, settings.enabled);
  if (!validation.ok) return validation;
  ensureDataDir();
  fs.writeFileSync(SETTINGS_FILE, `${JSON.stringify(settings, null, 2)}\n`, { mode: 0o600 });
  applySettingsToEnv(settings);
  require('./mail').resetMsalClient();
  return { ok: true, settings: getMailSettingsForAdmin() };
}

module.exports = { initMailSettings, getMailSettingsForAdmin, saveMailSettings };
