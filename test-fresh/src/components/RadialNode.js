/**
 * RadialNode Component
 *
 * Contact avatar node positioned on radar rings.
 * Includes random orbital movement animation and score badge overlay.
 *
 * @module components/RadialNode
 */

import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import ContactAvatar from './ContactAvatar';
import ScoreBadge from './ScoreBadge';
import { is } from '../utils/validators';

/**
 * Simple pseudo-random number generator for deterministic "random" values
 * @param {number} seed - Seed value (e.g., contact.id)
 * @returns {number} - Value between 0 and 1
 */
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * RadialNode - Floating contact avatar on radar
 *
 * @param {object} contact - Contact object with id, first_name, last_name, avatar, etc.
 * @param {number} x - X position relative to center (Cartesian)
 * @param {number} y - Y position relative to center (Cartesian)
 * @param {number} score - Proximity score (0-100)
 * @param {string} tier - Tier key ('inner' | 'middle' | 'outer' | 'distant')
 * @param {function} onPress - Callback when node is pressed, receives contact object
 * @param {boolean} showScore - Show score badge overlay (default: false)
 * @param {number} size - Avatar size in pixels (default: 48)
 */
function RadialNode({ contact, x = 0, y = 0, score = 0, tier, onPress, showScore = false, size = 48 }) {
  // All hooks must be called unconditionally at the top level

  // Generate deterministic "random" values based on contact.id
  const animationParams = useMemo(() => {
    const seed = contact?.id || 0;

    // Orbital radius: 3-8px from base position
    const orbitRadius = 3 + seededRandom(seed) * 5;

    // Duration: 3-6 seconds per orbit
    const duration = 3000 + seededRandom(seed + 1) * 3000;

    // Direction: clockwise (1) or counterclockwise (-1)
    const direction = seededRandom(seed + 2) > 0.5 ? 1 : -1;

    // Starting angle: 0-360 degrees
    const startAngle = seededRandom(seed + 3) * 360;

    return { orbitRadius, duration, direction, startAngle };
  }, [contact?.id]);

  // Orbital animation: angle progresses from 0 to 360 degrees
  const angle = useSharedValue(animationParams.startAngle);

  useEffect(() => {
    // Animate angle from startAngle to startAngle + 360 (or -360 for counterclockwise)
    angle.value = withRepeat(
      withTiming(
        animationParams.startAngle + (360 * animationParams.direction),
        { duration: animationParams.duration, easing: Easing.linear }
      ),
      -1, // Infinite repeat
      false // Don't reverse, continue in same direction
    );
  }, [angle, animationParams]);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';

    // Convert angle to radians
    const radians = (angle.value * Math.PI) / 180;

    // Calculate orbital offset (circular movement around base position)
    const offsetX = animationParams.orbitRadius * Math.cos(radians);
    const offsetY = animationParams.orbitRadius * Math.sin(radians);

    return {
      transform: [
        { translateX: x + offsetX },
        { translateY: y + offsetY },
      ],
    };
  });

  // Validate required props after all hooks have been called
  if (!contact || !is.object(contact)) {
    if (__DEV__) {
      console.warn('RadialNode: contact prop is required');
    }
    return null;
  }

  if (!is.number(x) || !is.number(y)) {
    if (__DEV__) {
      console.warn('RadialNode: x and y props must be numbers');
    }
    return null;
  }

  const handlePress = () => {
    if (is.function(onPress)) {
      onPress(contact);
    }
  };

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        style={styles.touchable}
      >
        <View style={styles.avatarContainer}>
          <ContactAvatar contact={contact} size={size} />

          {showScore && (
            <View style={styles.badgeContainer}>
              <ScoreBadge score={score} size="small" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    // Center the node on its coordinates
    marginLeft: -24, // Half of default avatar size (48 / 2)
    marginTop: -24,
  },
  touchable: {
    borderRadius: 24,
    overflow: 'visible',
  },
  avatarContainer: {
    position: 'relative',
  },
  badgeContainer: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

// Memoize with custom comparison
export default React.memo(RadialNode, (prevProps, nextProps) => {
  // Only re-render if critical props change
  return (
    prevProps.contact?.id === nextProps.contact?.id &&
    prevProps.x === nextProps.x &&
    prevProps.y === nextProps.y &&
    prevProps.score === nextProps.score &&
    prevProps.tier === nextProps.tier &&
    prevProps.showScore === nextProps.showScore &&
    prevProps.size === nextProps.size &&
    prevProps.contact?.first_name === nextProps.contact?.first_name &&
    prevProps.contact?.last_name === nextProps.contact?.last_name &&
    prevProps.contact?.avatar_attachment_id === nextProps.contact?.avatar_attachment_id
  );
});
