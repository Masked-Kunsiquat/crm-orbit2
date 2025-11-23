/**
 * Proximity Defaults - Constants for Relationship Proximity Scoring
 *
 * This file defines the default configuration for the relationship proximity
 * visualization feature, including scoring weights, brackets, and tier definitions.
 *
 * @module constants/proximityDefaults
 */

/**
 * Preset Configurations
 *
 * Each preset defines a different weighting strategy for calculating proximity scores.
 * All weights must sum to 1.0 (100%).
 */
export const PROXIMITY_PRESETS = {
  personal: {
    name: 'Personal',
    description: 'Balanced approach for personal relationships',
    weights: {
      recency: 0.40,      // How recently you connected
      frequency: 0.30,    // How often you connect
      quality: 0.20,      // Quality of interactions
      contactType: 0.10,  // Relationship category weight
    },
  },
  professional: {
    name: 'Professional',
    description: 'Optimized for business networking',
    weights: {
      recency: 0.30,      // Recent contact matters
      frequency: 0.40,    // Frequent touchpoints critical
      quality: 0.20,      // Quality matters
      contactType: 0.10,  // Role-based relationships
    },
  },
  family_focused: {
    name: 'Family Focused',
    description: 'Prioritizes family connections',
    weights: {
      recency: 0.25,      // Regular contact expected
      frequency: 0.25,    // Consistency important
      quality: 0.25,      // Quality time matters
      contactType: 0.25,  // Family designation heavily weighted
    },
  },
  social_butterfly: {
    name: 'Social Butterfly',
    description: 'Values frequency of contact',
    weights: {
      recency: 0.20,      // Less emphasis on recency
      frequency: 0.50,    // High value on staying in touch
      quality: 0.20,      // Some quality consideration
      contactType: 0.10,  // Standard relationship weighting
    },
  },
  custom: {
    name: 'Custom',
    description: 'User-defined weights',
    weights: null, // Will be set by user in settings
  },
};

/**
 * Default preset for new users
 */
export const DEFAULT_PRESET = 'personal';

/**
 * Recency Scoring Brackets
 *
 * Maps days since last interaction to score (0-100).
 * Lower days = higher score.
 */
export const RECENCY_BRACKETS = [
  { maxDays: 7, score: 100, label: 'This week' },
  { maxDays: 30, score: 80, label: 'This month' },
  { maxDays: 60, score: 50, label: 'Last 2 months' },
  { maxDays: 90, score: 20, label: 'Last 3 months' },
  { maxDays: Infinity, score: 0, label: 'Over 3 months' },
];

/**
 * Frequency Scoring Brackets
 *
 * Maps number of interactions in last 30 days to score (0-100).
 * Higher interaction count = higher score.
 */
export const FREQUENCY_BRACKETS = [
  { minCount: 10, score: 100, label: '10+ interactions' },
  { minCount: 6, score: 80, label: '6-9 interactions' },
  { minCount: 3, score: 50, label: '3-5 interactions' },
  { minCount: 1, score: 20, label: '1-2 interactions' },
  { minCount: 0, score: 0, label: 'No recent contact' },
];

/**
 * Interaction Quality Weights (2025 Edition)
 *
 * Maps interaction type to quality score.
 * Higher value = more meaningful interaction.
 *
 * Scale:
 * 5 = In-person (highest engagement)
 * 4 = Video (face-to-face virtual)
 * 3 = Voice (personal audio connection)
 * 2 = Real-time text (immediate engagement)
 * 1 = Async communication (delayed response)
 */
export const INTERACTION_QUALITY_WEIGHTS = {
  meeting: 5,        // In-person meetings (highest value)
  video_call: 4,     // Video calls (FaceTime, Teams, Zoom, WhatsApp)
  call: 3,           // Voice calls (phone, VoIP)
  text: 2,           // SMS, messaging apps (WhatsApp, iMessage)
  email: 1,          // Email (asynchronous)
  social_media: 1,   // Social media interactions (LinkedIn, Twitter, Instagram)
  other: 1,          // Unknown/miscellaneous
};

/**
 * Contact Type Baseline Scores
 *
 * Maps contact_type field to baseline score (0-100).
 * Applied as a weighted component in the final proximity calculation.
 */
export const CONTACT_TYPE_SCORES = {
  best_friend: 100,   // Closest personal relationships
  family: 100,        // Family members
  close_friend: 80,   // Close personal friends
  friend: 60,         // Regular friends
  colleague: 40,      // Work relationships
  acquaintance: 20,   // Light connections
  other: 10,          // Miscellaneous
  null: 0,            // Not specified (neutral - no bonus/penalty)
};

/**
 * Proximity Tier Definitions
 *
 * Maps score ranges to tier classifications with visual styling.
 */
export const PROXIMITY_TIERS = {
  inner: {
    minScore: 70,
    maxScore: 100,
    label: 'Inner Circle',
    emoji: '🟢',
    color: '#4CAF50',      // Green (Material Design)
    description: 'Your closest relationships',
  },
  middle: {
    minScore: 50,
    maxScore: 69,
    label: 'Middle Ring',
    emoji: '🟡',
    color: '#FFC107',      // Amber (Material Design)
    description: 'Regular connections',
  },
  outer: {
    minScore: 30,
    maxScore: 49,
    label: 'Outer Circle',
    emoji: '🟠',
    color: '#FF9800',      // Orange (Material Design)
    description: 'Occasional contacts',
  },
  distant: {
    minScore: 0,
    maxScore: 29,
    label: 'Distant',
    emoji: '🔴',
    color: '#F44336',      // Red (Material Design)
    description: 'Infrequent or no contact',
  },
};

/**
 * Tier Order (for rendering lists)
 */
export const TIER_ORDER = ['inner', 'middle', 'outer', 'distant'];

/**
 * Configuration Validation Rules
 */
export const VALIDATION_RULES = {
  // Sum of all weights must equal 1.0 (100%)
  WEIGHT_SUM_TOLERANCE: 0.001, // Allow 0.1% tolerance for floating point math

  // Individual weight constraints
  MIN_WEIGHT: 0.0,
  MAX_WEIGHT: 1.0,

  // Score ranges
  MIN_SCORE: 0,
  MAX_SCORE: 100,
};

/**
 * Helper: Get tier for a given score
 *
 * @param {number} score - Proximity score (0-100)
 * @returns {string} Tier key ('inner', 'middle', 'outer', or 'distant')
 */
export function getTierForScore(score) {
  if (score >= PROXIMITY_TIERS.inner.minScore) return 'inner';
  if (score >= PROXIMITY_TIERS.middle.minScore) return 'middle';
  if (score >= PROXIMITY_TIERS.outer.minScore) return 'outer';
  return 'distant';
}

/**
 * Helper: Get tier details for a given score
 *
 * @param {number} score - Proximity score (0-100)
 * @returns {object} Tier configuration object with label, emoji, color, etc.
 */
export function getTierDetails(score) {
  const tierKey = getTierForScore(score);
  return {
    tier: tierKey,
    ...PROXIMITY_TIERS[tierKey],
  };
}

/**
 * Helper: Validate custom weights
 *
 * @param {object} weights - Custom weight configuration
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateWeights(weights) {
  const errors = [];

  if (!weights || typeof weights !== 'object') {
    errors.push('Weights must be an object');
    return { valid: false, errors };
  }

  const required = ['recency', 'frequency', 'quality', 'contactType'];
  const missing = required.filter(key => !(key in weights));

  if (missing.length > 0) {
    errors.push(`Missing required weights: ${missing.join(', ')}`);
  }

  // Check individual weight ranges
  Object.entries(weights).forEach(([key, value]) => {
    if (typeof value !== 'number') {
      errors.push(`${key} must be a number`);
    } else if (value < VALIDATION_RULES.MIN_WEIGHT || value > VALIDATION_RULES.MAX_WEIGHT) {
      errors.push(`${key} must be between ${VALIDATION_RULES.MIN_WEIGHT} and ${VALIDATION_RULES.MAX_WEIGHT}`);
    }
  });

  // Check sum equals 1.0 (100%)
  if (errors.length === 0) {
    const sum = Object.values(weights).reduce((acc, val) => acc + val, 0);
    const diff = Math.abs(sum - 1.0);

    if (diff > VALIDATION_RULES.WEIGHT_SUM_TOLERANCE) {
      errors.push(`Weights must sum to 1.0 (currently ${sum.toFixed(3)})`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Helper: Get preset configuration by key
 *
 * @param {string} presetKey - Preset identifier
 * @param {object} customWeights - Optional custom weights (for 'custom' preset)
 * @returns {object|null} Preset configuration or null if invalid
 */
export function getPresetConfig(presetKey, customWeights = null) {
  if (presetKey === 'custom') {
    if (!customWeights) return null;
    const validation = validateWeights(customWeights);
    if (!validation.valid) return null;
    return {
      ...PROXIMITY_PRESETS.custom,
      weights: customWeights,
    };
  }

  return PROXIMITY_PRESETS[presetKey] || null;
}
