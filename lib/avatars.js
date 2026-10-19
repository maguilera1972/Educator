const crypto = require('crypto');
const {
  resolvePortalAvatar,
  persistPortalAvatarCache,
  buildPortalAvatarUrl,
} = require('./portal-avatars');

const GENERIC_AVATARS = [
  { id: 0, name: 'Ocean', color: '#2563eb' },
  { id: 1, name: 'Emerald', color: '#059669' },
  { id: 2, name: 'Amethyst', color: '#7c3aed' },
  { id: 3, name: 'Corail', color: '#ea580c' },
  { id: 4, name: 'Rubis', color: '#dc2626' },
  { id: 5, name: 'Saphir', color: '#0891b2' },
  { id: 6, name: 'Jade', color: '#16a34a' },
  { id: 7, name: 'Topaze', color: '#ca8a04' },
  { id: 8, name: 'Indigo', color: '#4f46e5' },
  { id: 9, name: 'Rose', color: '#db2777' },
  { id: 10, name: 'Ardoise', color: '#475569' },
  { id: 11, name: 'Forest', color: '#166534' },
];

function gravatarHash(email) {
  return crypto.createHash('md5').update(email.trim().toLowerCase()).digest('hex');
}

function gravatarUrl(email, size = 200) {
  const hash = gravatarHash(email);
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=404`;
}

function genericAvatarUrl(id = 0) {
  const safeId = Math.max(0, Math.min(11, parseInt(id, 10) || 0));
  return `/avatars/generic-${safeId}.svg`;
}

async function gravatarExists(email, timeoutMs = 2500) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(gravatarUrl(email, 80), {
        method: 'HEAD',
        signal: ctrl.signal,
      });
      return res.ok;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return false;
  }
}

function uploadedAvatarUrl(userId, filename) {
  if (!userId || !filename) return null;
  const bust = encodeURIComponent(String(filename));
  return `/api/profile/${userId}/avatar/file?v=${bust}`;
}

/**
 * @param {object} user
 * @param {object} [opts]
 * @param {boolean|null} [opts.gravatarAvailable]
 * @param {boolean|null} [opts.portalHasAvatar]
 * @param {string|null} [opts.portalAvatarUrl]
 */
function resolveAvatarUrl(user, opts = {}) {
  const gravatarAvailable = opts.gravatarAvailable ?? null;
  const portalHasAvatar = opts.portalHasAvatar
    ?? (user.portal_has_avatar === 1 || user.portal_has_avatar === true);
  const portalAvatarUrl = opts.portalAvatarUrl
    || user.portal_avatar_url
    || (portalHasAvatar ? buildPortalAvatarUrl(user.email) : null);

  const genericId = user.avatar_generic_id ?? 0;
  const filename = String(user.avatar_filename || '').trim();
  const mode = user.avatar_mode || 'auto';

  if (mode === 'upload' && filename) {
    return {
      avatar_url: uploadedAvatarUrl(user.id, filename),
      avatar_source: 'upload',
      avatar_filename: filename,
      portal_has_avatar: !!portalHasAvatar,
      portal_avatar_url: portalAvatarUrl || null,
    };
  }

  if (mode === 'portal') {
    if (portalHasAvatar && portalAvatarUrl) {
      return {
        avatar_url: portalAvatarUrl,
        avatar_source: 'portal',
        portal_has_avatar: true,
        portal_avatar_url: portalAvatarUrl,
        gravatar_fallback: filename
          ? uploadedAvatarUrl(user.id, filename)
          : genericAvatarUrl(genericId),
      };
    }
    // Portal photo missing — fall through to local / generic
  }

  if (mode === 'generic') {
    return {
      avatar_url: genericAvatarUrl(genericId),
      avatar_source: 'generic',
      portal_has_avatar: !!portalHasAvatar,
      portal_avatar_url: portalAvatarUrl || null,
    };
  }

  if (mode === 'gravatar') {
    return {
      avatar_url: gravatarUrl(user.email),
      avatar_source: 'gravatar',
      gravatar_fallback: genericAvatarUrl(genericId),
      portal_has_avatar: !!portalHasAvatar,
      portal_avatar_url: portalAvatarUrl || null,
    };
  }

  // auto (and portal-without-file): portal → local upload → gravatar → generic
  if (portalHasAvatar && portalAvatarUrl) {
    return {
      avatar_url: portalAvatarUrl,
      avatar_source: 'portal',
      portal_has_avatar: true,
      portal_avatar_url: portalAvatarUrl,
      gravatar_fallback: filename
        ? uploadedAvatarUrl(user.id, filename)
        : genericAvatarUrl(genericId),
    };
  }

  if (filename) {
    return {
      avatar_url: uploadedAvatarUrl(user.id, filename),
      avatar_source: 'upload',
      avatar_filename: filename,
      portal_has_avatar: false,
      portal_avatar_url: null,
    };
  }

  const hasGravatar = gravatarAvailable ?? user.gravatar_available === 1;
  if (hasGravatar) {
    return {
      avatar_url: gravatarUrl(user.email),
      avatar_source: 'gravatar',
      gravatar_fallback: genericAvatarUrl(genericId),
      portal_has_avatar: false,
      portal_avatar_url: null,
    };
  }

  return {
    avatar_url: genericAvatarUrl(genericId),
    avatar_source: 'generic',
    gravatar_available: false,
    portal_has_avatar: false,
    portal_avatar_url: null,
  };
}

async function enrichUserWithAvatar(user, db = null, { forcePortalRefresh = false } = {}) {
  if (!user?.email) return user;

  let portalHasAvatar = user.portal_has_avatar === 1 || user.portal_has_avatar === true;
  let portalAvatarUrl = user.portal_avatar_url || null;

  const needPortalProbe = forcePortalRefresh
    || user.portal_has_avatar == null
    || !user.portal_avatar_checked_at
    || ['auto', 'portal'].includes(user.avatar_mode || 'auto');

  if (needPortalProbe) {
    const portal = await resolvePortalAvatar(user.email, {
      force: forcePortalRefresh,
      cached: {
        hasAvatar: user.portal_has_avatar,
        avatarUrl: user.portal_avatar_url,
        checkedAt: user.portal_avatar_checked_at,
      },
    });
    portalHasAvatar = portal.hasAvatar;
    portalAvatarUrl = portal.avatarUrl;
    if (db && user.id) {
      persistPortalAvatarCache(db, user.id, portal);
    }
  }

  let gravatarAvailable = user.gravatar_available;
  if (
    (user.avatar_mode === 'auto' || !user.avatar_mode)
    && !portalHasAvatar
    && !String(user.avatar_filename || '').trim()
    && gravatarAvailable == null
  ) {
    gravatarAvailable = (await gravatarExists(user.email)) ? 1 : 0;
    if (db && user.id) {
      db.prepare('UPDATE users SET gravatar_available = ? WHERE id = ?').run(gravatarAvailable, user.id);
    }
  }

  const avatar = resolveAvatarUrl(user, {
    gravatarAvailable: gravatarAvailable === 1,
    portalHasAvatar,
    portalAvatarUrl,
  });

  return {
    ...user,
    ...avatar,
    gravatar_available: gravatarAvailable === 1,
    gravatar_url: gravatarUrl(user.email),
    portal_has_avatar: !!portalHasAvatar,
    portal_avatar_url: portalAvatarUrl || null,
  };
}

function enrichUserWithAvatarSync(user) {
  if (!user?.email) return user;
  const avatar = resolveAvatarUrl(user, {
    portalHasAvatar: user.portal_has_avatar === 1 || user.portal_has_avatar === true,
    portalAvatarUrl: user.portal_avatar_url || null,
  });
  return {
    ...user,
    ...avatar,
    gravatar_available: user.gravatar_available === 1,
    gravatar_url: gravatarUrl(user.email),
  };
}

module.exports = {
  GENERIC_AVATARS,
  gravatarHash,
  gravatarUrl,
  genericAvatarUrl,
  uploadedAvatarUrl,
  gravatarExists,
  resolveAvatarUrl,
  enrichUserWithAvatar,
  enrichUserWithAvatarSync,
};
