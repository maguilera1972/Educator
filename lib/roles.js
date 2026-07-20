const PRIMARY_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'michel@aguilera.ch').trim().toLowerCase();

const ASSIGNABLE_ROLES = ['learner', 'instructor', 'admin'];

function isPrimaryAdmin(user) {
  return !!user?.email && user.email.trim().toLowerCase() === PRIMARY_ADMIN_EMAIL;
}

function canAssignAdminRole(actor) {
  return isPrimaryAdmin(actor);
}

function normalizeRole(role, fallback = 'learner') {
  return ASSIGNABLE_ROLES.includes(role) ? role : fallback;
}

function assertRoleAssignmentAllowed(actor, newRole, targetUser = null) {
  if (newRole !== 'admin') return null;

  if (!canAssignAdminRole(actor)) {
    return 'Seul l\'administrateur principal peut créer ou promouvoir un administrateur';
  }

  return null;
}

function assertRoleChangeAllowed(actor, targetUser, newRole) {
  const roleError = assertRoleAssignmentAllowed(actor, newRole, targetUser);
  if (roleError) return roleError;

  if (targetUser.role === 'admin' && newRole !== 'admin' && !canAssignAdminRole(actor)) {
    return 'Seul l\'administrateur principal peut rétrograder un administrateur';
  }

  if (isPrimaryAdmin(targetUser) && newRole !== 'admin') {
    return 'Le rôle administrateur de l\'administrateur principal ne peut pas être retiré';
  }

  if (actor.id === targetUser.id && targetUser.role === 'admin' && newRole !== 'admin') {
    return 'Vous ne pouvez pas retirer votre propre rôle administrateur';
  }

  return null;
}

module.exports = {
  PRIMARY_ADMIN_EMAIL,
  ASSIGNABLE_ROLES,
  isPrimaryAdmin,
  canAssignAdminRole,
  normalizeRole,
  assertRoleAssignmentAllowed,
  assertRoleChangeAllowed,
};
