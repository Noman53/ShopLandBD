/**
 * Escape HTML special characters to prevent XSS attacks
 * @param unsafe - The unsafe string to escape
 * @returns The escaped HTML-safe string
 */
export const escapeHtml = (unsafe: string | null | undefined): string => {
  if (unsafe === null || unsafe === undefined) {
    return '';
  }
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};
