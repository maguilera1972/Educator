const express = require('express');
const fs = require('fs');
const path = require('path');
const { GENERIC_AVATARS, genericAvatarUrl } = require('../lib/avatars');
const {
  sharedAvatarsDir,
  emailAvatarKey,
  findSharedAvatarFile,
} = require('../lib/portal-avatars');

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

module.exports = function createAvatarsRouter() {
  const router = express.Router();

  router.get('/generics', (_req, res) => {
    res.json({
      generics: GENERIC_AVATARS.map((g) => ({
        ...g,
        url: genericAvatarUrl(g.id),
      })),
    });
  });

  /**
   * Stream a portal/shared avatar from /mnt/also-shared/avatars by email hash key.
   * Public (unguessable sha256 prefix) — same trust model as portal open approved GET.
   */
  router.get('/shared/:key', (req, res) => {
    const key = String(req.params.key || '').toLowerCase().replace(/[^a-f0-9]/g, '');
    if (key.length !== 32) {
      return res.status(400).json({ error: 'Invalid avatar key' });
    }

    const dir = sharedAvatarsDir();
    let filePath = null;
    let ext = null;
    for (const candidate of ['.png', '.jpg', '.jpeg', '.webp']) {
      const absolute = path.join(dir, `${key}${candidate}`);
      if (fs.existsSync(absolute)) {
        filePath = absolute;
        ext = candidate === '.jpeg' ? '.jpg' : candidate;
        break;
      }
    }

    if (!filePath) {
      return res.status(404).json({ error: 'Avatar not found' });
    }

    res.setHeader('Content-Type', MIME_BY_EXT[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.sendFile(path.resolve(filePath));
  });

  /** Debug/helper: resolve shared file for an email (auth not required; only reveals existence). */
  router.get('/shared-by-email', (req, res) => {
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    const shared = findSharedAvatarFile(email);
    if (!shared) {
      return res.status(404).json({ found: false, key: emailAvatarKey(email) });
    }
    return res.json({
      found: true,
      key: emailAvatarKey(email),
      filename: shared.filename,
      url: `/api/avatars/shared/${emailAvatarKey(email)}?v=${Math.floor(shared.mtimeMs)}`,
    });
  });

  return router;
};
