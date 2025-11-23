/**
 * Proximity Calculator - Relationship Strength Scoring Utility
 *
 * Calculates proximity scores (0-100) for contacts based on interaction history
 * and configurable weighting presets.
 *
 * @module utils/proximityCalculator
 */

import { daysBetween, parseLocalDate } from './dateUtils';
import { is } from './validators';
import { logger } from '../errors/utils/errorLogger';
import {
  RECENCY_BRACKETS,
  FREQUENCY_BRACKETS,
  INTERACTION_QUALITY_WEIGHTS,
  CONTACT_TYPE_SCORES,
  getTierDetails,
} from '../constants/proximityDefaults';

/**
 * Calculate recency score based on most recent interaction
 *
 * @param {Array<object>} interactions - Array of interaction objects
 * @param {Array<object>} brackets - Recency scoring brackets (optional override)
 * @returns {number} Score from 0-100
 */
export function calculateRecencyScore(interactions, brackets = RECENCY_BRACKETS) {
  try {
    // No interactions = 0 score
    if (!is.array(interactions) || interactions.length === 0) {
      return 0;
    }

    // Find most recent interaction date
    let mostRecentDate = null;
    for (const interaction of interactions) {
      if (!interaction.interaction_datetime) continue;

      const interactionDate = parseLocalDate(interaction.interaction_datetime);
      if (!interactionDate) continue;

      if (!mostRecentDate || interactionDate > mostRecentDate) {
        mostRecentDate = interactionDate;
      }
    }

    // No valid dates found
    if (!mostRecentDate) {
      return 0;
    }

    // Calculate days since last interaction
    const daysSinceLastContact = daysBetween(mostRecentDate, new Date());

    // Find matching bracket
    for (const bracket of brackets) {
      if (daysSinceLastContact <= bracket.maxDays) {
        return bracket.score;
      }
    }

    // Fallback (should not reach here if brackets include Infinity)
    return 0;
  } catch (error) {
    logger.error('ProximityCalculator', 'calculateRecencyScore', error, {
      interactionCount: interactions?.length,
    });
    return 0;
  }
}

/**
 * Calculate frequency score based on interaction count in last 30 days
 *
 * @param {Array<object>} interactions - Array of interaction objects
 * @param {Array<object>} brackets - Frequency scoring brackets (optional override)
 * @returns {number} Score from 0-100
 */
export function calculateFrequencyScore(
  interactions,
  brackets = FREQUENCY_BRACKETS
) {
  try {
    // No interactions = 0 score
    if (!is.array(interactions) || interactions.length === 0) {
      return 0;
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // Count interactions in last 30 days
    let recentCount = 0;
    for (const interaction of interactions) {
      if (!interaction.interaction_datetime) continue;

      const interactionDate = parseLocalDate(interaction.interaction_datetime);
      if (!interactionDate) continue;

      if (interactionDate >= thirtyDaysAgo && interactionDate <= now) {
        recentCount++;
      }
    }

    // Find matching bracket (reverse order - highest minCount first)
    const sortedBrackets = [...brackets].sort((a, b) => b.minCount - a.minCount);

    for (const bracket of sortedBrackets) {
      if (recentCount >= bracket.minCount) {
        return bracket.score;
      }
    }

    // Fallback (should not reach here if brackets include minCount: 0)
    return 0;
  } catch (error) {
    logger.error('ProximityCalculator', 'calculateFrequencyScore', error, {
      interactionCount: interactions?.length,
    });
    return 0;
  }
}

/**
 * Calculate quality score based on interaction types
 *
 * Computes a weighted average based on interaction quality weights.
 * Normalizes to 0-100 scale.
 *
 * @param {Array<object>} interactions - Array of interaction objects
 * @param {object} qualityWeights - Quality weight mapping (optional override)
 * @returns {number} Score from 0-100
 */
export function calculateQualityScore(
  interactions,
  qualityWeights = INTERACTION_QUALITY_WEIGHTS
) {
  try {
    // No interactions = 0 score
    if (!is.array(interactions) || interactions.length === 0) {
      return 0;
    }

    // Calculate weighted sum
    let weightedSum = 0;
    let validInteractionCount = 0;

    for (const interaction of interactions) {
      const type = interaction.interaction_type;
      if (!type) continue;

      const weight = qualityWeights[type] || qualityWeights.other || 1;
      weightedSum += weight;
      validInteractionCount++;
    }

    // No valid interactions
    if (validInteractionCount === 0) {
      return 0;
    }

    // Calculate average quality
    const avgQuality = weightedSum / validInteractionCount;

    // Normalize to 0-100 scale
    // Max possible weight is 5 (meeting), so:
    const maxWeight = Math.max(...Object.values(qualityWeights));
    const normalized = (avgQuality / maxWeight) * 100;

    return Math.min(100, Math.max(0, normalized));
  } catch (error) {
    logger.error('ProximityCalculator', 'calculateQualityScore', error, {
      interactionCount: interactions?.length,
    });
    return 0;
  }
}

/**
 * Calculate contact type score
 *
 * @param {object} contact - Contact object with contact_type field
 * @param {object} typeScores - Contact type score mapping (optional override)
 * @returns {number} Score from 0-100
 */
export function calculateContactTypeScore(
  contact,
  typeScores = CONTACT_TYPE_SCORES
) {
  try {
    if (!contact || !is.object(contact)) {
      return 0;
    }

    const contactType = contact.contact_type;

    // Null/undefined = 0 (neutral)
    if (!contactType) {
      return typeScores.null || 0;
    }

    // Look up score
    return typeScores[contactType] || typeScores.other || 0;
  } catch (error) {
    logger.error('ProximityCalculator', 'calculateContactTypeScore', error, {
      contactId: contact?.id,
    });
    return 0;
  }
}

/**
 * Calculate overall proximity score for a contact
 *
 * Combines recency, frequency, quality, and contact type scores using
 * configurable weights.
 *
 * @param {object} contact - Contact object
 * @param {Array<object>} interactions - Interaction objects for this contact
 * @param {object} config - Configuration object with weights
 * @param {number} config.weights.recency - Recency weight (0-1)
 * @param {number} config.weights.frequency - Frequency weight (0-1)
 * @param {number} config.weights.quality - Quality weight (0-1)
 * @param {number} config.weights.contactType - Contact type weight (0-1)
 * @returns {number} Final proximity score (0-100)
 */
export function calculateProximityScore(contact, interactions, config) {
  try {
    // Validate inputs
    if (!contact || !is.object(contact)) {
      logger.warn('ProximityCalculator', 'Invalid contact object', { contact });
      return 0;
    }

    if (!config || !config.weights) {
      logger.warn('ProximityCalculator', 'Invalid config object', { config });
      return 0;
    }

    const { weights } = config;

    // Ensure interactions is an array
    const validInteractions = is.array(interactions) ? interactions : [];

    // Calculate component scores
    const recencyScore = calculateRecencyScore(validInteractions);
    const frequencyScore = calculateFrequencyScore(validInteractions);
    const qualityScore = calculateQualityScore(validInteractions);
    const contactTypeScore = calculateContactTypeScore(contact);

    // Apply weighted average
    const finalScore =
      recencyScore * weights.recency +
      frequencyScore * weights.frequency +
      qualityScore * weights.quality +
      contactTypeScore * weights.contactType;

    // Ensure score is in valid range
    const clampedScore = Math.min(100, Math.max(0, finalScore));

    logger.debug('ProximityCalculator', 'calculateProximityScore', {
      contactId: contact.id,
      contactName: contact.display_name,
      interactionCount: validInteractions.length,
      recencyScore,
      frequencyScore,
      qualityScore,
      contactTypeScore,
      weights,
      finalScore: clampedScore,
    });

    return clampedScore;
  } catch (error) {
    logger.error('ProximityCalculator', 'calculateProximityScore', error, {
      contactId: contact?.id,
      interactionCount: interactions?.length,
    });
    return 0;
  }
}

/**
 * Get proximity tier for a given score
 *
 * Convenience wrapper around getTierDetails from constants.
 *
 * @param {number} score - Proximity score (0-100)
 * @returns {object} Tier object with { tier, label, emoji, color, description }
 */
export function getProximityTier(score) {
  return getTierDetails(score);
}

/**
 * Group contacts by proximity tier
 *
 * Organizes contacts into tier groups and sorts by score within each tier.
 *
 * @param {Array<object>} contactsWithScores - Contacts with proximityScore field
 * @returns {object} Grouped contacts: { inner: [], middle: [], outer: [], distant: [] }
 */
export function groupByProximity(contactsWithScores) {
  try {
    if (!is.array(contactsWithScores)) {
      logger.warn('ProximityCalculator', 'Invalid contactsWithScores array');
      return { inner: [], middle: [], outer: [], distant: [] };
    }

    // Initialize groups
    const groups = {
      inner: [],
      middle: [],
      outer: [],
      distant: [],
    };

    // Assign contacts to tiers
    for (const contact of contactsWithScores) {
      if (!contact || !is.number(contact.proximityScore)) {
        logger.warn('ProximityCalculator', 'Contact missing proximityScore', {
          contactId: contact?.id,
        });
        continue;
      }

      const tierInfo = getProximityTier(contact.proximityScore);
      const tierKey = tierInfo.tier;

      if (groups[tierKey]) {
        groups[tierKey].push(contact);
      } else {
        logger.warn('ProximityCalculator', 'Unknown tier', {
          tier: tierKey,
          contactId: contact.id,
        });
      }
    }

    // Sort each tier by score (descending - highest first)
    for (const tierKey of Object.keys(groups)) {
      groups[tierKey].sort((a, b) => b.proximityScore - a.proximityScore);
    }

    logger.success('ProximityCalculator', 'groupByProximity', {
      innerCount: groups.inner.length,
      middleCount: groups.middle.length,
      outerCount: groups.outer.length,
      distantCount: groups.distant.length,
    });

    return groups;
  } catch (error) {
    logger.error('ProximityCalculator', 'groupByProximity', error, {
      contactCount: contactsWithScores?.length,
    });
    return { inner: [], middle: [], outer: [], distant: [] };
  }
}

/**
 * Calculate proximity scores for multiple contacts
 *
 * Batch processing helper that calculates scores for an array of contacts.
 *
 * @param {Array<object>} contacts - Array of contact objects
 * @param {object} interactionsByContactId - Map of contactId → interactions array
 * @param {object} config - Proximity configuration with weights
 * @returns {Array<object>} Contacts with added proximityScore field
 */
export function calculateProximityScores(contacts, interactionsByContactId, config) {
  try {
    if (!is.array(contacts)) {
      logger.warn('ProximityCalculator', 'Invalid contacts array');
      return [];
    }

    if (!is.object(interactionsByContactId)) {
      logger.warn('ProximityCalculator', 'Invalid interactionsByContactId map');
      return contacts.map(c => ({ ...c, proximityScore: 0 }));
    }

    const contactsWithScores = contacts.map(contact => {
      const contactInteractions = interactionsByContactId[contact.id] || [];
      const score = calculateProximityScore(contact, contactInteractions, config);

      return {
        ...contact,
        proximityScore: score,
      };
    });

    logger.success('ProximityCalculator', 'calculateProximityScores', {
      contactCount: contacts.length,
      avgScore:
        contactsWithScores.reduce((sum, c) => sum + c.proximityScore, 0) /
        contactsWithScores.length,
    });

    return contactsWithScores;
  } catch (error) {
    logger.error('ProximityCalculator', 'calculateProximityScores', error, {
      contactCount: contacts?.length,
    });
    return contacts.map(c => ({ ...c, proximityScore: 0 }));
  }
}
