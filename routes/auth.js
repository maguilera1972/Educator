const express = require('express');
const bcrypt = require('bcryptjs');
const { signToken, authRequired } = require('../middleware/auth');
const { USER_PUBLIC_COLUMNS, sanitizeUser, normalizeCompany } = require('../lib/users');
const { enrichUserWithAvatar } = require('../lib/avatars');
const {
  lookupPortalUserByEmail,
  portalDisplayName,
  portalCompanyField,
} = require('../lib/portal-lookup');

const PORTAL_REGISTER_URL = (
  process.env.PORTAL_PUBLIC_URL || 'https://also.eureka-training.online'
).replace(/\/$/, '') + '/register';

module.exports = function createAuthRouter(db) {
  const router = express.Router();

  router.post('/register', async (req, res) => {
    const { email, password, role } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (role === 'admin') {
      return res.status(403).json({ error: 'The administrator role cannot be chosen at registration' });
    }

    const emailNorm = email.trim().toLowerCase();

    // Portal is source of truth for ALSO identity
    const lookup = await lookupPortalUserByEmail(emailNorm);
    if (!lookup.ok) {
      return res.status(lookup.status || 503).json({ error: lookup.error });
    }

    const portal = lookup.data;
    if (!portal?.found) {
      return res.status(403).json({
        error: 'No ALSO portal account found for this email. Register on the portal first.',
        portal_register_url: PORTAL_REGISTER_URL,
        code: 'portal_account_required',
      });
    }

    // Always create as Learner from portal identity (do not invent name/role)
    const fullName = portalDisplayName(portal);
    const companyResult = normalizeCompany(portalCompanyField(portal), { required: true });
    if (!companyResult.ok) {
      return res.status(400).json({ error: companyResult.error });
    }

    const portalApproved = portal.status === 'approved';
    const approved = portalApproved ? 1 : 0;
    const passwordHash = bcrypt.hashSync(password, 10);

    try {
      const result = db.prepare(
        'INSERT INTO users (email, password_hash, name, role, approved, is_instructor, company) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(
        portal.email || emailNorm,
        passwordHash,
        fullName,
        'learner',
        approved,
        0,
        companyResult.company
      );

      const user = db.prepare(
        `SELECT ${USER_PUBLIC_COLUMNS} FROM users WHERE id = ?`
      ).get(result.lastInsertRowid);

      const enriched = await enrichUserWithAvatar(user, db);
      const token = signToken(enriched);

      const response = {
        user: enriched,
        token,
        portal_status: portal.status,
        portal_user_id: portal.portalUserId || null,
        pending_approval: !portalApproved,
        identity_source: 'also_portal',
      };

      if (portalApproved) {
        response.message =
          'Account created from your ALSO portal profile. An LMS administrator may still assign courses.';
      } else {
        response.message =
          'Account created from your ALSO portal profile. Portal approval is still pending — LMS access stays limited until approved.';
      }

      res.status(201).json(response);
    } catch (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({ error: 'This email is already in use' });
      }
      throw err;
    }
  });

  router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Incorrect email or password' });
    }

    const publicUser = db.prepare(`SELECT ${USER_PUBLIC_COLUMNS} FROM users WHERE id = ?`).get(user.id);
    const enriched = await enrichUserWithAvatar(publicUser, db, { forcePortalRefresh: true });
    const token = signToken(enriched);
    res.json({ user: enriched, token });
  });

  router.get('/me', authRequired, async (req, res) => {
    const user = db.prepare(
      `SELECT ${USER_PUBLIC_COLUMNS} FROM users WHERE id = ?`
    ).get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const enriched = await enrichUserWithAvatar(user, db, { forcePortalRefresh: true });
    const token = signToken(enriched);
    res.json({ user: enriched, token });
  });

  return router;
};
