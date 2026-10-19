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
    return 'Only the primary administrator can create or promote an administrator';
  }

  return null;
}

function assertRoleChangeAllowed(actor, targetUser, newRole) {
  const roleError = assertRoleAssignmentAllowed(actor, newRole, targetUser);
  if (roleError) return roleError;

  if (targetUser.role === 'admin' && newRole !== 'admin' && !canAssignAdminRole(actor)) {
    return 'Only the primary administrator can demote an administrator';
  }

  if (isPrimaryAdmin(targetUser) && newRole !== 'admin') {
    return 'The primary administrator’s admin role cannot be removed';
  }

  if (actor.id === targetUser.id && targetUser.role === 'admin' && newRole !== 'admin') {
    return 'You cannot remove your own administrator role';
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
