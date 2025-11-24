/**
 * RadarRing Component
 *
 * Static ring outline for a proximity tier.
 * Rendered as an SVG circle with tier-based color and opacity.
 *
 * @module components/RadarRing
 */

import React from 'react';
import { Circle } from 'react-native-svg';
import { is } from '../utils/validators';

/**
 * RadarRing - Static tier ring for radar visualization
 *
 * @param {string} tier - Tier key ('inner' | 'middle' | 'outer' | 'distant')
 * @param {number} radius - Ring radius in pixels
 * @param {string} color - Ring color (hex or rgba)
 * @param {number} opacity - Ring opacity (0-1), default 0.3
 * @param {number} strokeWidth - Ring stroke width in pixels, default 1.5
 */
function RadarRing({ tier, radius, color = '#000000', opacity = 0.3, strokeWidth = 1.5 }) {
  // Validate required props
  if (!is.string(tier)) {
    if (__DEV__) {
      console.warn('RadarRing: tier prop must be a string');
    }
    return null;
  }

  if (!is.number(radius) || radius <= 0) {
    if (__DEV__) {
      console.warn('RadarRing: radius prop must be a positive number');
    }
    return null;
  }

  // Validate optional props
  const validOpacity = is.number(opacity) ? Math.max(0, Math.min(1, opacity)) : 0.3;
  const validStrokeWidth = is.number(strokeWidth) && strokeWidth > 0 ? strokeWidth : 1.5;
  const validColor = is.string(color) && color.trim() !== '' ? color : '#000000';

  return (
    <Circle
      cx={0}
      cy={0}
      r={radius}
      stroke={validColor}
      strokeWidth={validStrokeWidth}
      strokeOpacity={validOpacity}
      fill="none"
    />
  );
}

// Memoize to prevent unnecessary re-renders
export default React.memo(RadarRing);
