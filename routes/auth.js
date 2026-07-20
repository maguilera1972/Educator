const express = require('express');
const bcrypt = require('bcryptjs');
const { signToken, authRequired } = require('../middleware/auth');
const { USER_PUBLIC_COLUMNS, sanitizeUser, enrichPublicUser, normalizeCompany } = require('../lib/users');
const { enrichUserWithAvatar } = require('../lib/avatars');

module.exports = function createAuthRouter(db) {
  const router = express.Router();

  router.post('/register', async (req, res) => {
    const { email, password, name, first_name, last_name, role, company } = req.body;
    const fullName = name?.trim()
      || [first_name?.trim(), last_name?.trim()].filter(Boolean).join(' ');

    if (first_name !== undefined || last_name !== undefined) {
      if (!first_name?.trim() || !last_name?.trim()) {
        return res.status(400).json({ error: 'Prénom et nom de famille requis' });
      }
    }

    if (!email?.trim() || !password || !fullName) {
      return res.status(400).json({ error: 'Email, mot de passe, prénom et nom de famille requis' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    const allowedRoles = ['learner', 'instructor'];
    if (role === 'admin') {
      return res.status(403).json({ error: 'Le rôle administrateur ne peut pas être choisi à l\'inscription' });
    }
    const userRole = allowedRoles.includes(role) ? role : 'learner';
    const companyResult = normalizeCompany(company, { required: userRole === 'learner' });
    if (!companyResult.ok) {
      return res.status(400).json({ error: companyResult.error });
    }

    const approved = 0;
    const passwordHash = bcrypt.hashSync(password, 10);

    try {
      const result = db.prepare(
        'INSERT INTO users (email, password_hash, name, role, approved, is_instructor, company) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(
        email.trim().toLowerCase(),
        passwordHash,
        fullName,
        userRole,
        approved,
        0,
        companyResult.company
      );

      const user = db.prepare(
        `SELECT ${USER_PUBLIC_COLUMNS} FROM users WHERE id = ?`
      ).get(result.lastInsertRowid);

      const enriched = await enrichUserWithAvatar(user, db);
      const token = signToken(enriched);
      const response = { user: enriched, token, pending_approval: true };

      if (userRole === 'instructor') {
        response.message =
          'Inscription enregistrée. Un administrateur doit valider votre profil formateur et vous assigner les formations à enseigner.';
      } else {
        response.message =
          'Inscription enregistrée. Un administrateur doit valider votre compte et vous assigner vos formations.';
      }

      res.status(201).json(response);
    } catch (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({ error: 'Cet email est déjà utilisé' });
      }
      throw err;
    }
  });

  router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const safeUser = sanitizeUser(user);
    const publicUser = db.prepare(`SELECT ${USER_PUBLIC_COLUMNS} FROM users WHERE id = ?`).get(user.id);
    const enriched = await enrichUserWithAvatar(publicUser, db);
    const token = signToken(enriched);
    res.json({ user: enriched, token });
  });

  router.get('/me', authRequired, async (req, res) => {
    const user = db.prepare(
      `SELECT ${USER_PUBLIC_COLUMNS} FROM users WHERE id = ?`
    ).get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const enriched = await enrichUserWithAvatar(user, db);
    const token = signToken(enriched);
    res.json({ user: enriched, token });
  });

  return router;
};
