const jwt = require('jsonwebtoken');
const { resolveJwtSecret } = require('../lib/jwt-secret');

const JWT_SECRET = resolveJwtSecret();
const JWT_EXPIRES = process.env.JWT_EXPIRES || '30d';

function signToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    approved: user.approved !== undefined ? !!user.approved : true,
    is_instructor: !!user.is_instructor,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

function authFromHeaderOrQuery(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ')
    ? header.slice(7)
    : req.query.token;

  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      return next();
    } catch {
      return res.status(401).json({ error: 'Token invalide ou expiré' });
    }
  }

  // Ticket court pour <video>/<iframe> (évite les URLs trop longues → HTTP 414)
  if (req.query.ticket) {
    try {
      const { verifyStreamTicket } = require('../lib/stream-ticket');
      const claims = verifyStreamTicket(String(req.query.ticket));
      if (!claims) {
        return res.status(401).json({ error: 'Ticket de lecture invalide ou expiré' });
      }
      if (
        String(claims.courseId) !== String(req.params.courseId)
        || String(claims.materialId) !== String(req.params.materialId)
      ) {
        return res.status(403).json({ error: 'Ticket non valide pour ce contenu' });
      }
      // Charger le vrai utilisateur (formateur/admin inclus)
      const db = req.app?.locals?.db;
      if (db) {
        const row = db.prepare(
          'SELECT id, email, role, approved, is_instructor FROM users WHERE id = ?'
        ).get(claims.userId);
        if (!row) {
          return res.status(401).json({ error: 'Utilisateur introuvable' });
        }
        req.user = {
          id: row.id,
          email: row.email,
          role: row.role,
          approved: !!row.approved,
          is_instructor: !!row.is_instructor,
          stream_ticket: true,
        };
      } else {
        req.user = {
          id: claims.userId,
          role: 'learner',
          approved: true,
          is_instructor: false,
          stream_ticket: true,
        };
      }
      return next();
    } catch {
      return res.status(401).json({ error: 'Ticket de lecture invalide' });
    }
  }

  return res.status(401).json({ error: 'Authentification requise' });
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access unauthorized' });
    }
    next();
  };
}

function attachUserFromDb(db) {
  return (req, res, next) => {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentification requise' });
    }
    const row = db.prepare('SELECT id, email, role, approved, is_instructor FROM users WHERE id = ?').get(req.user.id);
    if (!row) {
      return res.status(401).json({ error: 'Utilisateur introuvable' });
    }
    req.user = {
      id: row.id,
      email: row.email,
      role: row.role,
      approved: !!row.approved,
      is_instructor: !!row.is_instructor,
    };
    next();
  };
}

function requireInstructorOrAdmin(db) {
  return (req, res, next) => {
    if (!req.user?.id) {
      return res.status(403).json({ error: 'Access unauthorized' });
    }

    const row = db.prepare('SELECT role, approved, is_instructor FROM users WHERE id = ?').get(req.user.id);
    if (!row) {
      return res.status(403).json({ error: 'Access unauthorized' });
    }

    if (row.role === 'admin' || row.is_instructor) {
      req.user.role = row.role;
      req.user.approved = !!row.approved;
      req.user.is_instructor = !!row.is_instructor;
      return next();
    }

    if (row.role !== 'instructor' || !row.approved) {
      return res.status(403).json({
        error: row.role === 'instructor'
          ? 'Votre compte formateur doit être validé par un administrateur'
          : 'Access unauthorized',
      });
    }

    req.user.role = row.role;
    req.user.approved = !!row.approved;
    next();
  };
}

module.exports = {
  signToken,
  authRequired,
  authFromHeaderOrQuery,
  requireRole,
  attachUserFromDb,
  requireInstructorOrAdmin,
  JWT_SECRET,
};
