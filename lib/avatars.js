const crypto = require('crypto');

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

async function gravatarExists(email) {
  try {
    const res = await fetch(gravatarUrl(email, 80), { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

function uploadedAvatarUrl(userId, filename) {
  if (!userId || !filename) return null;
  const bust = encodeURIComponent(String(filename));
  return `/api/profile/${userId}/avatar/file?v=${bust}`;
}

function resolveAvatarUrl(user, gravatarAvailable = null) {
  const genericId = user.avatar_generic_id ?? 0;
  const filename = String(user.avatar_filename || '').trim();

  if (user.avatar_mode === 'upload' && filename) {
    return {
      avatar_url: uploadedAvatarUrl(user.id, filename),
      avatar_source: 'upload',
      avatar_filename: filename,
    };
  }

  // Prefer a stored upload when mode is upload but filename missing → fall through
  if (user.avatar_mode === 'generic') {
    return { avatar_url: genericAvatarUrl(genericId), avatar_source: 'generic' };
  }

  if (user.avatar_mode === 'gravatar') {
    return {
      avatar_url: gravatarUrl(user.email),
      avatar_source: 'gravatar',
      gravatar_fallback: genericAvatarUrl(genericId),
    };
  }

  // auto: uploaded photo wins when present
  if (filename && user.avatar_mode === 'auto') {
    return {
      avatar_url: uploadedAvatarUrl(user.id, filename),
      avatar_source: 'upload',
      avatar_filename: filename,
    };
  }

  const hasGravatar = gravatarAvailable ?? user.gravatar_available === 1;
  if (hasGravatar) {
    return {
      avatar_url: gravatarUrl(user.email),
      avatar_source: 'gravatar',
      gravatar_fallback: genericAvatarUrl(genericId),
    };
  }

  return {
    avatar_url: genericAvatarUrl(genericId),
    avatar_source: 'generic',
    gravatar_available: false,
  };
}

async function enrichUserWithAvatar(user, db = null) {
  if (!user?.email) return user;

  let gravatarAvailable = user.gravatar_available;
  if (user.avatar_mode === 'auto' && gravatarAvailable == null) {
    gravatarAvailable = (await gravatarExists(user.email)) ? 1 : 0;
    if (db && user.id) {
      db.prepare('UPDATE users SET gravatar_available = ? WHERE id = ?').run(gravatarAvailable, user.id);
    }
  }

  const avatar = resolveAvatarUrl(user, gravatarAvailable === 1);
  return {
    ...user,
    ...avatar,
    gravatar_available: gravatarAvailable === 1,
    gravatar_url: gravatarUrl(user.email),
  };
}

function enrichUserWithAvatarSync(user) {
  if (!user?.email) return user;
  const avatar = resolveAvatarUrl(user);
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
