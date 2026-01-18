/**
 * Check if a user is an organization administrator
 */
export const isOrgAdmin = (user) => {
  return user?.organization_role === 'admin';
};

/**
 * Check if a user is an organization member
 */
export const isOrgMember = (user) => {
  return user?.organization_role === 'member';
};

/**
 * Check if user has required role
 */
export const hasRole = (user, requiredRole) => {
  return user?.organization_role === requiredRole;
};

/**
 * Check if user has organization assigned
 */
export const hasOrganization = (user) => {
  return !!user?.organization_id;
};