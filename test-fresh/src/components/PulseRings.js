/**
 * PulseRings Component
 *
 * Animated pulsing rings for radar visualization.
 * Expands from center with fade effect, inspired by AirDrop radar.
 *
 * @module components/PulseRings
 */

import React, { useEffect } from 'react';
import { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

// Create animated Circle component
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Single pulse ring with animation
 *
 * @param {number} maxRadius - Maximum expansion radius
 * @param {number} delay - Animation start delay in ms
 * @param {number} duration - Animation duration in ms (default: 3000)
 * @param {string} color - Ring color (default: '#6750A4')
 */
function PulseRing({ maxRadius, delay, duration = 3000, color = '#6750A4' }) {
  const radius = useSharedValue(0);
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    // Animate radius from 0 to maxRadius
    radius.value = withDelay(
      delay,
      withRepeat(
        withTiming(maxRadius, {
          duration,
          easing: Easing.out(Easing.ease),
        }),
        -1, // Infinite repeat
        false
      )
    );

    // Animate opacity from 0.5 to 0 (fade out)
    opacity.value = withDelay(
      delay,
      withRepeat(
        withTiming(0, {
          duration,
          easing: Easing.out(Easing.ease),
        }),
        -1, // Infinite repeat
        false
      )
    );
  }, [maxRadius, delay, duration, radius, opacity]);

  const animatedProps = useAnimatedProps(() => {
    return {
      r: radius.value,
      strokeOpacity: opacity.value,
    };
  });

  return (
    <AnimatedCircle
      cx={0}
      cy={0}
      animatedProps={animatedProps}
      stroke={color}
      strokeWidth={2}
      fill="none"
    />
  );
}

/**
 * PulseRings - Multiple staggered pulse animations
 *
 * @param {number} maxRadius - Maximum expansion radius (screen-dependent)
 * @param {number} numRings - Number of pulse rings (default: 3)
 * @param {number} duration - Animation duration per ring in ms (default: 3000)
 * @param {string} color - Ring color (default: primary theme color)
 */
export default function PulseRings({ maxRadius, numRings = 3, duration = 3000, color = '#6750A4' }) {
  // Validate props
  if (!maxRadius || maxRadius <= 0) {
    if (__DEV__) {
      console.warn('PulseRings: maxRadius must be a positive number');
    }
    return null;
  }

  // Safely convert and validate numRings
  const parsedNumRings = Number(numRings);
  const validNumRings = Number.isFinite(parsedNumRings) && parsedNumRings > 0
    ? Math.floor(Math.max(1, Math.min(5, parsedNumRings))) // Clamp to 1-5 and ensure integer
    : 3; // Fallback to default

  // Safely validate duration
  const parsedDuration = Number(duration);
  const validDuration = Number.isFinite(parsedDuration) && parsedDuration > 0
    ? parsedDuration
    : 3000; // Fallback to default

  // Calculate stagger delay (evenly distribute start times)
  const staggerDelay = validDuration / validNumRings;

  // Generate rings with staggered delays
  const rings = Array.from({ length: validNumRings }, (_, index) => (
    <PulseRing
      key={`pulse-ring-${index}`}
      maxRadius={maxRadius}
      delay={index * staggerDelay}
      duration={validDuration}
      color={color}
    />
  ));

  return <>{rings}</>;
}
