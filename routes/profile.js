const express = require('express');
const fs = require('fs');
const path = require('path');
const { authRequired } = require('../middleware/auth');
const { USER_PUBLIC_COLUMNS, enrichPublicUser, publicRoleLabel } = require('../lib/users');
const {
  GENERIC_AVATARS,
  gravatarUrl,
  genericAvatarUrl,
  gravatarExists,
  enrichUserWithAvatar,
} = require('../lib/avatars');
const { sanitizeProfileBio } = require('../lib/profile-bio');
const {
  profileBioUpload,
  profileBioImageUrl,
  resolveProfileBioImagePath,
  profileAvatarUpload,
  resolveProfileAvatarPath,
  deleteStoredFile,
} = require('../lib/uploads');

module.exports = function createProfileRouter(db) {
  const router = express.Router();

  router.get('/avatar', authRequired, async (req, res) => {
    const user = db.prepare(`SELECT ${USER_PUBLIC_COLUMNS}, profile_bio FROM users WHERE id = ?`).get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const enriched = await enrichUserWithAvatar(user, db);
    const hasGravatar = await gravatarExists(user.email);

    res.json({
      user: enriched,
      profile_bio: user.profile_bio || '',
      gravatar_available: hasGravatar,
      gravatar_url: gravatarUrl(user.email),
      generics: GENERIC_AVATARS.map((g) => ({
        ...g,
        url: genericAvatarUrl(g.id),
      })),
    });
  });

  router.put('/avatar', authRequired, async (req, res) => {
    const { avatar_mode, avatar_generic_id } = req.body;
    const allowedModes = ['auto', 'gravatar', 'generic', 'upload'];
    const mode = allowedModes.includes(avatar_mode) ? avatar_mode : 'auto';
    const genericId = Math.max(0, Math.min(11, parseInt(avatar_generic_id, 10) || 0));

    const user = db.prepare(`SELECT ${USER_PUBLIC_COLUMNS} FROM users WHERE id = ?`).get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (mode === 'upload' && !String(user.avatar_filename || '').trim()) {
      return res.status(400).json({ error: 'Upload a photo before selecting the uploaded avatar source' });
    }

    let gravatarAvailable = user.gravatar_available;
    if (mode === 'auto' || mode === 'gravatar') {
      gravatarAvailable = (await gravatarExists(user.email)) ? 1 : 0;
    }

    db.prepare(
      'UPDATE users SET avatar_mode = ?, avatar_generic_id = ?, gravatar_available = ? WHERE id = ?'
    ).run(mode, genericId, gravatarAvailable, user.id);

    const updated = db.prepare(`SELECT ${USER_PUBLIC_COLUMNS} FROM users WHERE id = ?`).get(user.id);
    const enriched = await enrichUserWithAvatar(updated, db);

    res.json({ user: enriched });
  });

  router.post('/avatar/upload', authRequired, (req, res) => {
    profileAvatarUpload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message || 'Upload failed' });
      }
      if (!req.file) {
        return res.status(400).json({ error: 'No file received' });
      }

      const user = db.prepare(`SELECT ${USER_PUBLIC_COLUMNS} FROM users WHERE id = ?`).get(req.user.id);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const previous = String(user.avatar_filename || '').trim();
      if (previous && previous !== req.file.filename) {
        const oldPath = resolveProfileAvatarPath(req.user.id, previous);
        if (oldPath) deleteStoredFile(oldPath);
      }

      db.prepare(
        "UPDATE users SET avatar_filename = ?, avatar_mode = 'upload' WHERE id = ?"
      ).run(req.file.filename, req.user.id);

      const updated = db.prepare(`SELECT ${USER_PUBLIC_COLUMNS} FROM users WHERE id = ?`).get(req.user.id);
      const enriched = await enrichUserWithAvatar(updated, db);
      res.status(201).json({ user: enriched, filename: req.file.filename });
    });
  });

  router.get('/:userId/avatar/file', authRequired, (req, res) => {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) return res.status(400).json({ error: 'Invalid user' });

    const user = db.prepare('SELECT id, avatar_filename FROM users WHERE id = ?').get(userId);
    if (!user || !user.avatar_filename) {
      return res.status(404).json({ error: 'Avatar not found' });
    }

    const filePath = resolveProfileAvatarPath(userId, user.avatar_filename);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Avatar file not found' });
    }

    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.sendFile(path.resolve(filePath));
  });

  router.get('/bio', authRequired, (req, res) => {
    const row = db.prepare('SELECT profile_bio FROM users WHERE id = ?').get(req.user.id);
    if (!row) return res.status(404).json({ error: 'User not found' });
    res.json({ profile_bio: row.profile_bio || '' });
  });

  router.put('/bio', authRequired, (req, res) => {
    const bio = sanitizeProfileBio(req.body?.profile_bio || '');
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    db.prepare('UPDATE users SET profile_bio = ? WHERE id = ?').run(bio, user.id);
    res.json({ ok: true, profile_bio: bio, message: 'Bio saved' });
  });

  router.post('/bio/images', authRequired, (req, res) => {
    profileBioUpload.single('file')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message || 'Upload impossible' });
      }
      if (!req.file) {
        return res.status(400).json({ error: 'No file received' });
      }

      const url = profileBioImageUrl(req.user.id, req.file.filename);
      res.status(201).json({ url, filename: req.file.filename });
    });
  });

  router.get('/bio/images/:userId/:filename', (req, res) => {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) return res.status(400).json({ error: 'Invalid user' });
    const filePath = resolveProfileBioImagePath(userId, req.params.filename);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).send('Not found');
    }
    res.sendFile(filePath);
  });

  router.get('/:userId/preview', authRequired, (req, res) => {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) return res.status(400).json({ error: 'Invalid user' });

    const user = db.prepare(`SELECT ${USER_PUBLIC_COLUMNS}, profile_bio FROM users WHERE id = ?`).get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const enriched = enrichPublicUser(user);
    res.json({
      user: enriched,
      profile_bio: user.profile_bio || '',
      role_label: publicRoleLabel(user),
    });
  });

  router.get('/:userId/avatar', authRequired, (req, res) => {
    const user = db.prepare(`SELECT ${USER_PUBLIC_COLUMNS} FROM users WHERE id = ?`).get(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: enrichPublicUser(user) });
  });

  router.get('/:userId/bio', authRequired, (req, res) => {
    const user = db.prepare('SELECT id, name FROM users WHERE id = ?').get(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const row = db.prepare('SELECT profile_bio FROM users WHERE id = ?').get(req.params.userId);
    res.json({
      user_id: user.id,
      name: user.name,
      profile_bio: row?.profile_bio || '',
    });
  });

  return router;
};
