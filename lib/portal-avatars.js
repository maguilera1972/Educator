/**
 * ALSO Portal shared avatars (synced by email).
 * Spec: internal/portal-avatar-sync.md
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { lookupPortalUserByEmail, portalBaseUrl } = require('./portal-lookup');

const DEFAULT_SHARED_DIR = '/mnt/also-shared/avatars';
const DEFAULT_PORTAL_PUBLIC = 'https://also.eureka-training.online';
const CACHE_TTL_MS = 5 * 60 * 1000;

function sharedAvatarsDir() {
  return (
    process.env.PORTAL_AVATARS_DIR
    || process.env.ALSO_SHARED_AVATARS_DIR
    || DEFAULT_SHARED_DIR
  );
}

function portalPublicOrigin() {
  return (
    process.env.PORTAL_PUBLIC_URL
    || DEFAULT_PORTAL_PUBLIC
  ).replace(/\/$/, '');
}

function emailAvatarKey(email) {
  return crypto
    .createHash('sha256')
    .update(String(email || '').trim().toLowerCase())
    .digest('hex')
    .slice(0, 32);
}

function avatarHmacSecret() {
  return String(
    process.env.PORTAL_AVATAR_TOKEN_SECRET
    || process.env.PORTAL_LMS_LOOKUP_SECRET
    || ''
  ).trim();
}

function signAvatarToken(email) {
  const secret = avatarHmacSecret();
  if (!secret || secret.length < 16) return null;
  return crypto
    .createHmac('sha256', secret)
    .update(String(email || '').trim().toLowerCase())
    .digest('hex');
}

/** Public img-friendly portal URL (same shape portal returns). */
function buildPortalAvatarUrl(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return null;
  const q = new URLSearchParams({ email: normalized });
  const token = signAvatarToken(normalized);
  if (token) q.set('token', token);
  return `${portalPublicOrigin()}/api/avatars/by-email?${q.toString()}`;
}

/** Direct shared-volume file if present (jpg|png|webp). */
function findSharedAvatarFile(email) {
  const dir = sharedAvatarsDir();
  const key = emailAvatarKey(email);
  if (!key || !fs.existsSync(dir)) return null;
  for (const ext of ['.png', '.jpg', '.jpeg', '.webp']) {
    const filename = `${key}${ext}`;
    const absolute = path.join(dir, filename);
    if (fs.existsSync(absolute)) {
      try {
        const st = fs.statSync(absolute);
        if (st.isFile() && st.size > 0) {
          return { filename, absolutePath: absolute, mtimeMs: st.mtimeMs, size: st.size };
        }
      } catch {
        /* ignore */
      }
    }
  }
  return null;
}

/**
 * LMS-local URL that streams the shared file (works even if portal HTTP is down).
 * Prefer portal public URL when available for cross-app consistency.
 */
function sharedAvatarLmsUrl(email, fileMeta) {
  const key = emailAvatarKey(email);
  const bust = fileMeta?.mtimeMs ? Math.floor(fileMeta.mtimeMs) : Date.now();
  return `/api/avatars/shared/${encodeURIComponent(key)}?v=${bust}`;
}

function cacheIsFresh(checkedAt) {
  if (!checkedAt) return false;
  const ts = Date.parse(checkedAt);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts < CACHE_TTL_MS;
}

/**
 * Resolve whether the portal/shared avatar exists for this email.
 * @returns {Promise<{ hasAvatar: boolean, avatarUrl: string|null, source: string|null }>}
 */
async function resolvePortalAvatar(email, { force = false, cached = null } = {}) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) {
    return { hasAvatar: false, avatarUrl: null, source: null };
  }

  if (!force && cached && cacheIsFresh(cached.checkedAt) && cached.hasAvatar != null) {
    return {
      hasAvatar: !!cached.hasAvatar,
      avatarUrl: cached.hasAvatar
        ? (cached.avatarUrl || buildPortalAvatarUrl(normalized))
        : null,
      source: cached.hasAvatar ? (cached.source || 'portal') : null,
    };
  }

  // 1) Shared filesystem (same mount as portal)
  const shared = findSharedAvatarFile(normalized);
  if (shared) {
    // Prefer portal HTTP URL so LMS shows the same URL the portal embeds
    const portalUrl = buildPortalAvatarUrl(normalized);
    return {
      hasAvatar: true,
      avatarUrl: portalUrl || sharedAvatarLmsUrl(normalized, shared),
      source: 'shared',
      shared,
    };
  }

  // 2) Portal internal lookup (hasAvatar / avatarUrl)
  try {
    const lookup = await lookupPortalUserByEmail(normalized);
    if (lookup.ok && lookup.data?.found && lookup.data.hasAvatar) {
      return {
        hasAvatar: true,
        avatarUrl: lookup.data.avatarUrl || buildPortalAvatarUrl(normalized),
        source: 'portal-api',
      };
    }
  } catch {
    /* ignore — fall through */
  }

  // 3) HEAD/GET portal public image (token) as last probe
  const probeUrl = buildPortalAvatarUrl(normalized);
  if (probeUrl) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 2500);
      try {
        const res = await fetch(probeUrl, { method: 'GET', signal: ctrl.signal });
        if (res.ok) {
          const ctype = String(res.headers.get('content-type') || '');
          if (ctype.startsWith('image/')) {
            return { hasAvatar: true, avatarUrl: probeUrl, source: 'portal-http' };
          }
        }
      } finally {
        clearTimeout(timer);
      }
    } catch {
      /* no portal avatar */
    }
  }

  return { hasAvatar: false, avatarUrl: null, source: null };
}

function persistPortalAvatarCache(db, userId, result) {
  if (!db || !userId) return;
  try {
    db.prepare(`
      UPDATE users
      SET portal_has_avatar = ?, portal_avatar_url = ?, portal_avatar_checked_at = datetime('now')
      WHERE id = ?
    `).run(
      result.hasAvatar ? 1 : 0,
      result.avatarUrl || '',
      userId
    );
  } catch {
    /* columns may not exist yet during early boot */
  }
}

module.exports = {
  sharedAvatarsDir,
  emailAvatarKey,
  signAvatarToken,
  buildPortalAvatarUrl,
  findSharedAvatarFile,
  sharedAvatarLmsUrl,
  resolvePortalAvatar,
  persistPortalAvatarCache,
  portalBaseUrl,
  CACHE_TTL_MS,
};
