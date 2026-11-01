/**
 * Format price based on language
 * Uses Bangla numerals for 'bn' and English numerals for 'en'
 */
export const formatPrice = (amount: number, language: 'bn' | 'en' = 'bn'): string => {
  const locale = language === 'bn' ? 'bn-BD' : 'en-BD';
  const formatted = amount.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return language === 'bn' ? `৳${formatted}` : `TK ${formatted}`;
};

/**
 * Format date based on language
 */
export const formatDate = (dateString: string, language: 'bn' | 'en' = 'bn'): string => {
  const date = new Date(dateString);
  const locale = language === 'bn' ? 'bn-BD' : 'en-BD';
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format number based on language
 */
export const formatNumber = (num: number, language: 'bn' | 'en' = 'bn'): string => {
  const locale = language === 'bn' ? 'bn-BD' : 'en-BD';
  return num.toLocaleString(locale);
};
