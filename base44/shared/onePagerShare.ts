export const SHARE_TYPE = "organization_one_pager";
export const SHARE_DURATION_DAYS = 30;

export function createShareExpiry() {
  return new Date(Date.now() + SHARE_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export function createShareToken() {
  return `${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "")}`;
}

export function isExpired(expiresAt) {
  return !expiresAt || new Date(expiresAt).getTime() <= Date.now();
}