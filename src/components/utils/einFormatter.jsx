/**
 * Format EIN to XX-XXXXXXX format
 * @param {string} ein - The EIN (with or without dash)
 * @returns {string|null} - Formatted EIN or null
 */
export function formatEIN(ein) {
  if (!ein) return null;
  
  // Remove all non-digits
  const digits = ein.replace(/\D/g, '');
  
  // Must be exactly 9 digits
  if (digits.length !== 9) return ein;
  
  // Format as XX-XXXXXXX
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

/**
 * Normalize EIN for comparison (remove all non-digits)
 * @param {string} ein - The EIN
 * @returns {string|null} - Normalized EIN or null
 */
export function normalizeEIN(ein) {
  if (!ein) return null;
  return ein.replace(/\D/g, '');
}