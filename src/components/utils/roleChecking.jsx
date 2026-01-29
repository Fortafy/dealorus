/**
 * Check if a user is a client administrator
 */
export const isOrgAdmin = (user) => {
  return user?.role === 'admin' || user?.client_role === 'admin';
};

/**
 * Check if a user is a client member
 */
export const isOrgMember = (user) => {
  return user?.client_role === 'member';
};

/**
 * Check if user has required role
 */
export const hasRole = (user, requiredRole) => {
  return user?.client_role === requiredRole;
};

/**
 * Check if user has client assigned
 */
export const hasOrganization = (user) => {
  return !!user?.client_id;
};