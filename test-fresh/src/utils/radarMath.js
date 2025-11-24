/**
 * Radar Math Utilities
 *
 * Geometry utilities for radar visualization mode.
 * Handles polar-to-Cartesian conversions, angular distribution,
 * and position calculations for contact nodes on concentric rings.
 *
 * @module utils/radarMath
 */

import { is } from './validators';

/**
 * Tier-to-radius mapping configuration
 * Maps tier keys to relative radius percentages (0-1)
 */
const TIER_RADIUS_MAP = {
  inner: 0.25,    // 25% of max radius
  middle: 0.50,   // 50% of max radius
  outer: 0.75,    // 75% of max radius
  distant: 1.00,  // 100% of max radius (full circle)
};

/**
 * Get radius for a given tier
 *
 * @param {string} tier - Tier key ('inner' | 'middle' | 'outer' | 'distant')
 * @param {number} maxRadius - Maximum radius in pixels (screen-dependent)
 * @returns {number} Radius in pixels for the tier
 *
 * @example
 * getRadiusForTier('inner', 240) // Returns 60
 * getRadiusForTier('middle', 240) // Returns 120
 */
export function getRadiusForTier(tier, maxRadius) {
  if (!is.string(tier)) {
    throw new TypeError('tier must be a string');
  }

  if (!is.number(maxRadius) || maxRadius <= 0) {
    throw new TypeError('maxRadius must be a positive number');
  }

  const radiusRatio = TIER_RADIUS_MAP[tier];

  if (radiusRatio === undefined) {
    throw new Error(`Unknown tier: ${tier}. Valid tiers: ${Object.keys(TIER_RADIUS_MAP).join(', ')}`);
  }

  return maxRadius * radiusRatio;
}

/**
 * Calculate evenly distributed angles for N items around a circle
 *
 * @param {number} index - Item index (0-based)
 * @param {number} total - Total number of items
 * @param {number} startAngle - Starting angle in degrees (default: 0, pointing right)
 * @returns {number} Angle in degrees (0-360)
 *
 * @example
 * getAngleForIndex(0, 4, 0) // Returns 0 (right)
 * getAngleForIndex(1, 4, 0) // Returns 90 (down)
 * getAngleForIndex(2, 4, 0) // Returns 180 (left)
 * getAngleForIndex(3, 4, 0) // Returns 270 (up)
 */
export function getAngleForIndex(index, total, startAngle = 0) {
  if (!is.number(index) || index < 0) {
    throw new TypeError('index must be a non-negative number');
  }

  if (!is.number(total) || total <= 0) {
    throw new TypeError('total must be a positive number');
  }

  if (!is.number(startAngle)) {
    throw new TypeError('startAngle must be a number');
  }

  // Special case: single item centered at startAngle
  if (total === 1) {
    return startAngle % 360;
  }

  // Calculate angle step (360 degrees / total items)
  const angleStep = 360 / total;

  // Calculate angle for this index
  const angle = (startAngle + (index * angleStep)) % 360;

  return angle;
}

/**
 * Convert polar coordinates to Cartesian coordinates
 *
 * Origin is at center of screen. Positive X is right, positive Y is down (React Native convention).
 *
 * @param {number} angle - Angle in degrees (0 = right, 90 = down, 180 = left, 270 = up)
 * @param {number} radius - Radius in pixels
 * @returns {{x: number, y: number}} Cartesian coordinates relative to center
 *
 * @example
 * getXYFromPolar(0, 100)   // Returns {x: 100, y: 0}   (right)
 * getXYFromPolar(90, 100)  // Returns {x: 0, y: 100}   (down)
 * getXYFromPolar(180, 100) // Returns {x: -100, y: 0}  (left)
 * getXYFromPolar(270, 100) // Returns {x: 0, y: -100}  (up)
 */
export function getXYFromPolar(angle, radius) {
  if (!is.number(angle)) {
    throw new TypeError('angle must be a number');
  }

  if (!is.number(radius) || radius < 0) {
    throw new TypeError('radius must be a non-negative number');
  }

  // Convert degrees to radians
  const radians = (angle * Math.PI) / 180;

  // Calculate X and Y
  // Note: In React Native, Y increases downward, so we use sin(angle) for Y
  const x = radius * Math.cos(radians);
  const y = radius * Math.sin(radians);

  return { x, y };
}

/**
 * Adjust radius within a tier band based on proximity score
 *
 * Contacts with higher scores within a tier are placed slightly closer to center.
 *
 * @param {number} baseRadius - Base radius for the tier (in pixels)
 * @param {number} score - Proximity score (0-100)
 * @param {number} tierMinScore - Minimum score for this tier
 * @param {number} tierMaxScore - Maximum score for this tier
 * @param {number} bandWidth - Width of the tier band in pixels (default: 20)
 * @returns {number} Adjusted radius in pixels
 *
 * @example
 * // Inner tier: scores 70-100, base radius 60px
 * adjustRadiusWithinBand(60, 100, 70, 100, 20) // Returns 50 (highest score → closest)
 * adjustRadiusWithinBand(60, 85, 70, 100, 20)  // Returns 55 (mid score → middle)
 * adjustRadiusWithinBand(60, 70, 70, 100, 20)  // Returns 60 (lowest score → farthest)
 */
export function adjustRadiusWithinBand(baseRadius, score, tierMinScore, tierMaxScore, bandWidth = 20) {
  if (!is.number(baseRadius) || baseRadius < 0) {
    throw new TypeError('baseRadius must be a non-negative number');
  }

  if (!is.number(score)) {
    throw new TypeError('score must be a number');
  }

  if (!is.number(tierMinScore) || !is.number(tierMaxScore)) {
    throw new TypeError('tierMinScore and tierMaxScore must be numbers');
  }

  if (tierMinScore >= tierMaxScore) {
    throw new Error('tierMinScore must be less than tierMaxScore');
  }

  if (!is.number(bandWidth) || bandWidth < 0) {
    throw new TypeError('bandWidth must be a non-negative number');
  }

  // Clamp score to tier range
  const clampedScore = Math.max(tierMinScore, Math.min(tierMaxScore, score));

  // Calculate score position within tier (0 = min score, 1 = max score)
  const scoreRatio = (clampedScore - tierMinScore) / (tierMaxScore - tierMinScore);

  // Higher score → smaller radius (closer to center)
  // Subtract bandWidth * (1 - scoreRatio) to move inward for higher scores
  const adjustedRadius = baseRadius - (bandWidth * (1 - scoreRatio));

  return Math.max(0, adjustedRadius); // Ensure non-negative
}

/**
 * Calculate screen-adaptive maximum radius
 *
 * @param {number} screenWidth - Screen width in pixels
 * @param {number} screenHeight - Screen height in pixels
 * @param {number} padding - Padding from screen edges (default: 40)
 * @returns {number} Maximum radius in pixels
 *
 * @example
 * getMaxRadius(375, 667, 40) // iPhone SE: Returns ~147
 * getMaxRadius(414, 896, 40) // iPhone 11 Pro Max: Returns ~187
 */
export function getMaxRadius(screenWidth, screenHeight, padding = 40) {
  if (!is.number(screenWidth) || screenWidth <= 0) {
    throw new TypeError('screenWidth must be a positive number');
  }

  if (!is.number(screenHeight) || screenHeight <= 0) {
    throw new TypeError('screenHeight must be a positive number');
  }

  if (!is.number(padding) || padding < 0) {
    throw new TypeError('padding must be a non-negative number');
  }

  // Calculate usable space (subtract padding from both sides)
  const usableWidth = screenWidth - (padding * 2);
  const usableHeight = screenHeight - (padding * 2);

  // Use the smaller dimension to ensure circles fit
  const maxRadius = Math.min(usableWidth, usableHeight) / 2;

  return maxRadius;
}

/**
 * Enforce minimum spacing between nodes on the same tier
 *
 * Detects overlapping nodes and adjusts angles to maintain minimum separation.
 *
 * @param {Array<{angle: number, radius: number}>} positions - Array of polar positions
 * @param {number} minAngleSeparation - Minimum angle separation in degrees (default: 15)
 * @returns {Array<{angle: number, radius: number}>} Adjusted positions
 *
 * @example
 * const positions = [
 *   { angle: 0, radius: 100 },
 *   { angle: 5, radius: 100 }, // Too close!
 *   { angle: 45, radius: 100 }
 * ];
 * const adjusted = enforceMinimumSpacing(positions, 15);
 * // Returns positions with at least 15° separation
 */
export function enforceMinimumSpacing(positions, minAngleSeparation = 15) {
  if (!is.array(positions)) {
    throw new TypeError('positions must be an array');
  }

  if (!is.number(minAngleSeparation) || minAngleSeparation < 0) {
    throw new TypeError('minAngleSeparation must be a non-negative number');
  }

  if (positions.length === 0) {
    return [];
  }

  // Sort by angle for easier collision detection
  const sorted = [...positions].sort((a, b) => a.angle - b.angle);

  // Adjusted positions
  const adjusted = [];

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    let adjustedAngle = current.angle;

    // Check against previous position
    if (i > 0) {
      const previous = adjusted[i - 1];
      const separation = adjustedAngle - previous.angle;

      if (separation < minAngleSeparation) {
        // Too close, push this node forward
        adjustedAngle = previous.angle + minAngleSeparation;
      }
    }

    adjusted.push({
      ...current,
      angle: adjustedAngle % 360,
    });
  }

  return adjusted;
}

/**
 * Generate positions for all contacts in a tier
 *
 * High-level helper that combines all geometry functions.
 *
 * @param {Array<object>} contacts - Array of contact objects with proximityScore
 * @param {string} tier - Tier key ('inner' | 'middle' | 'outer' | 'distant')
 * @param {number} tierMinScore - Minimum score for tier
 * @param {number} tierMaxScore - Maximum score for tier
 * @param {number} maxRadius - Maximum radius in pixels
 * @param {number} bandWidth - Tier band width in pixels (default: 20)
 * @returns {Array<{contact: object, x: number, y: number, angle: number, radius: number}>}
 *
 * @example
 * const innerContacts = [
 *   { id: 1, name: 'Alice', proximityScore: 95 },
 *   { id: 2, name: 'Bob', proximityScore: 80 }
 * ];
 * const positions = generateTierPositions(innerContacts, 'inner', 70, 100, 240, 20);
 * // Returns [{contact, x, y, angle, radius}, ...]
 */
export function generateTierPositions(contacts, tier, tierMinScore, tierMaxScore, maxRadius, bandWidth = 20) {
  if (!is.array(contacts)) {
    throw new TypeError('contacts must be an array');
  }

  if (contacts.length === 0) {
    return [];
  }

  // Get base radius for tier
  const baseRadius = getRadiusForTier(tier, maxRadius);

  // Generate positions
  const positions = contacts.map((contact, index) => {
    const score = contact.proximityScore || 0;

    // Calculate angle (evenly distributed)
    const angle = getAngleForIndex(index, contacts.length, 0);

    // Adjust radius based on score within tier
    const adjustedRadius = adjustRadiusWithinBand(
      baseRadius,
      score,
      tierMinScore,
      tierMaxScore,
      bandWidth
    );

    // Convert to Cartesian coordinates
    const { x, y } = getXYFromPolar(angle, adjustedRadius);

    return {
      contact,
      x,
      y,
      angle,
      radius: adjustedRadius,
    };
  });

  return positions;
}
