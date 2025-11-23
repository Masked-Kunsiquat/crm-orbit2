/**
 * Contact Types - Shared constants for relationship categorization
 *
 * Used in contact forms (Add/Edit) and proximity scoring calculations.
 *
 * @module constants/contactTypes
 */

/**
 * Valid contact type values for relationship categorization
 *
 * These types are used for:
 * - Contact form selection (AddContactModal, EditContactModal)
 * - Proximity scoring (contact_type field in database)
 * - Baseline scores in proximity calculations
 *
 * Order: Descending by typical relationship strength/closeness
 */
export const CONTACT_TYPES = [
  'best_friend',
  'family',
  'close_friend',
  'friend',
  'colleague',
  'acquaintance',
  'other',
];
