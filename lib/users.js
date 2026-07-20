const USER_PUBLIC_COLUMNS = 'id, email, name, role, approved, is_instructor, avatar_mode, avatar_generic_id, gravatar_available, company, created_at';
const { enrichUserWithAvatarSync } = require('./avatars');

function normalizeCompany(value, { required = false } = {}) {
  const company = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (required && !company) {
    return { ok: false, error: 'Entreprise requise pour un apprenant' };
  }
  if (company.length > 120) {
    return { ok: false, error: 'Le nom d\'entreprise est trop long (120 caractères max)' };
  }
  return { ok: true, company };
}

function enrichPublicUser(user) {
  return enrichUserWithAvatarSync(sanitizeUser(user));
}

function isApprovedInstructor(user, db) {
  if (!user || user.role !== 'instructor') return false;
  if (user.approved !== undefined) return !!user.approved;
  const row = db.prepare('SELECT approved FROM users WHERE id = ?').get(user.id);
  return !!row?.approved;
}

function isActiveInstructor(user, db = null) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.is_instructor) return true;
  if (user.role !== 'instructor') return false;
  if (db) return isApprovedInstructor(user, db);
  return !!user.approved;
}

function canReceiveTeachingAssignments(user) {
  if (!user) return false;
  if (user.role === 'admin') return !!user.is_instructor;
  return user.role === 'instructor' && !!user.approved;
}

function sanitizeUser(user) {
  if (!user) return user;
  const { password_hash, ...safe } = user;
  let email = safe.email;
  // Hide / repair display of emails corrupted by polluted .env values
  if (typeof email === 'string' && (/\s/.test(email) || /=/.test(email))) {
    const match = email.match(/[^\s=]+@[^\s=]+\.[^\s=]+/);
    email = match ? match[0] : 'adresse-invalide';
  }
  return {
    ...safe,
    email,
    company: safe.company || '',
    approved: !!safe.approved,
    is_instructor: !!safe.is_instructor,
  };
}

function publicRoleLabel(user) {
  if (!user) return '';
  const roles = [];
  if (user.role === 'admin') roles.push('Administrateur');
  if (user.role === 'learner' && !user.is_instructor) roles.push('Apprenant');
  if (user.role === 'instructor' || user.is_instructor) roles.push('Formateur');
  return roles.join(', ') || user.role;
}

module.exports = {
  USER_PUBLIC_COLUMNS,
  normalizeCompany,
  isApprovedInstructor,
  isActiveInstructor,
  canReceiveTeachingAssignments,
  sanitizeUser,
  enrichPublicUser,
  publicRoleLabel,
};
