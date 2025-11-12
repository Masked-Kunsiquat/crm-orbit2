/**
 * Industry options for company management
 * Used across company-related components and screens
 *
 * NOTE: These are the database values (English).
 * For display purposes, use getIndustryLabel() with i18n.
 */
export const INDUSTRIES = [
  'Technology',
  'Finance',
  'Healthcare',
  'Retail',
  'Manufacturing',
  'Education',
  'Consulting',
  'Real Estate',
  'Other',
];

/**
 * Get the localized label for an industry value
 * @param {string} industry - The industry value (from database)
 * @param {Function} t - i18next translation function
 * @returns {string} - Localized industry name
 */
export function getIndustryLabel(industry, t) {
  if (!industry || !t) return industry || '';

  // Convert to lowercase and replace spaces with underscores for translation key
  const key = industry.toLowerCase().replace(/\s+/g, ' ');

  // Return translated value, fallback to original if translation missing
  return t(`industries.${key}`, { defaultValue: industry });
}
