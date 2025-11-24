/**
 * RadialNode Component
 *
 * Contact avatar node positioned on radar rings.
 * Includes subtle float animation and score badge overlay.
 *
 * @module components/RadialNode
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import ContactAvatar from './ContactAvatar';
import ScoreBadge from './ScoreBadge';
import { is } from '../utils/validators';

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
function RadialNode({ contact, x, y, score = 0, tier, onPress, showScore = false, size = 48 }) {
  // Validate required props
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

  // Floating animation values
  const floatY = useSharedValue(0);

  useEffect(() => {
    // Subtle up-down float animation (±2px)
    floatY.value = withRepeat(
      withSequence(
        withTiming(-2, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(2, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1, // Infinite repeat
      true // Reverse direction
    );
  }, [floatY]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: x },
        { translateY: y + floatY.value },
      ],
    };
  });

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
