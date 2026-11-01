/**
 * Input validation utilities for email and Bangladesh phone numbers
 */

// Email validation regex - standard format
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Bangladesh phone number validation
// Accepts: 01XXXXXXXXX, +8801XXXXXXXXX, 8801XXXXXXXXX
// Operators: 013-019 (Grameenphone, Banglalink, Robi, Airtel, Teletalk)
const BD_PHONE_REGEX = /^(?:\+?880|0)?1[3-9]\d{8}$/;

/**
 * Validates email format
 * @param email - Email string to validate
 * @returns true if valid email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Validates Bangladesh phone number
 * Accepts formats: 01XXXXXXXXX, +8801XXXXXXXXX, 8801XXXXXXXXX
 * @param phone - Phone number string to validate
 * @returns true if valid BD phone number
 */
export function isValidBDPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  // Remove spaces and dashes
  const cleaned = phone.replace(/[\s-]/g, '');
  return BD_PHONE_REGEX.test(cleaned);
}

/**
 * Normalizes Bangladesh phone number to 11-digit format (01XXXXXXXXX)
 * @param phone - Phone number string to normalize
 * @returns Normalized 11-digit phone number or original if invalid
 */
export function normalizeBDPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return phone;
  
  // Remove spaces, dashes
  let cleaned = phone.replace(/[\s-]/g, '');
  
  // Remove +880 prefix
  if (cleaned.startsWith('+880')) {
    cleaned = cleaned.slice(4);
  }
  // Remove 880 prefix (without +)
  else if (cleaned.startsWith('880') && cleaned.length === 14) {
    cleaned = cleaned.slice(3);
  }
  
  // Ensure it starts with 0
  if (cleaned.startsWith('1') && cleaned.length === 10) {
    cleaned = '0' + cleaned;
  }
  
  return cleaned;
}

/**
 * Validates either email or BD phone number
 * @param input - Input string (email or phone)
 * @returns Object with validation result and type
 */
export function validateEmailOrPhone(input: string): { 
  isValid: boolean; 
  type: 'email' | 'phone' | 'unknown';
  error?: string;
} {
  if (!input || typeof input !== 'string' || !input.trim()) {
    return { isValid: false, type: 'unknown', error: 'Please enter email or phone number' };
  }
  
  const trimmed = input.trim();
  
  // Check if it looks like an email (contains @)
  if (trimmed.includes('@')) {
    if (isValidEmail(trimmed)) {
      return { isValid: true, type: 'email' };
    }
    return { isValid: false, type: 'email', error: 'Please enter a valid email address' };
  }
  
  // Check if it looks like a phone number
  if (/^[\d\s\-+]+$/.test(trimmed)) {
    if (isValidBDPhone(trimmed)) {
      return { isValid: true, type: 'phone' };
    }
    return { isValid: false, type: 'phone', error: 'Please enter a valid Bangladesh phone number (01XXXXXXXXX)' };
  }
  
  return { isValid: false, type: 'unknown', error: 'Please enter a valid email or phone number' };
}

/**
 * Password validation
 * @param password - Password to validate
 * @returns Object with validation result and error message
 */
export function validatePassword(password: string): {
  isValid: boolean;
  error?: string;
} {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  if (password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters' };
  }
  return { isValid: true };
}
