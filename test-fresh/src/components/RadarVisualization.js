/**
 * RadarVisualization Component
 *
 * Main radar visualization component that composes rings and contact nodes.
 * Inspired by AirDrop's radar interface.
 *
 * @module components/RadarVisualization
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from 'react-native-paper';
import Svg from 'react-native-svg';
import RadarRing from './RadarRing';
import PulseRings from './PulseRings';
import RadialNode from './RadialNode';
import { getMaxRadius, generateTierPositions } from '../utils/radarMath';
import { PROXIMITY_TIERS } from '../constants/proximityDefaults';
import { is } from '../utils/validators';
import { logger } from '../errors/utils/errorLogger';

/**
 * RadarVisualization - Complete radar view with rings and contact nodes
 *
 * @param {object} proximityGroups - Grouped contacts by tier
 *   {
 *     inner: Array<Contact>,
 *     middle: Array<Contact>,
 *     outer: Array<Contact>,
 *     distant: Array<Contact>
 *   }
 * @param {function} onContactPress - Callback when contact is tapped
 * @param {boolean} showScores - Show score badges on nodes (default: false)
 * @param {boolean} enablePulse - Enable pulsing animation (default: true)
 * @param {number} padding - Padding from screen edges (default: 60)
 */
export default function RadarVisualization({
  proximityGroups,
  onContactPress,
  showScores = false,
  enablePulse = true,
  padding = 60,
}) {
  // All hooks must be called unconditionally at the top level
  const theme = useTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Calculate dimensions
  const maxRadius = useMemo(() => {
    return getMaxRadius(screenWidth, screenHeight, padding);
  }, [screenWidth, screenHeight, padding]);

  const centerX = screenWidth / 2;
  const centerY = screenHeight / 2;

  // Generate positions for all tiers
  const allPositions = useMemo(() => {
    // Guard against invalid proximityGroups inside useMemo
    if (!proximityGroups || !is.object(proximityGroups)) {
      return [];
    }

    const positions = [];

    // Process each tier
    const tiers = ['inner', 'middle', 'outer', 'distant'];

    tiers.forEach((tierKey) => {
      const contacts = proximityGroups[tierKey] || [];
      if (contacts.length === 0) return;

      const tierInfo = PROXIMITY_TIERS[tierKey];
      if (!tierInfo) return;

      const tierPositions = generateTierPositions(
        contacts,
        tierKey,
        tierInfo.minScore,
        tierInfo.maxScore,
        maxRadius,
        20 // bandWidth for score-based nudging
      );

      positions.push(...tierPositions);
    });

    logger.success('RadarVisualization', 'generatePositions', {
      totalNodes: positions.length,
      maxRadius,
    });

    return positions;
  }, [proximityGroups, maxRadius]);

  // Extract tier data for rendering rings
  const tierRings = useMemo(() => {
    return [
      { tier: 'inner', ...PROXIMITY_TIERS.inner },
      { tier: 'middle', ...PROXIMITY_TIERS.middle },
      { tier: 'outer', ...PROXIMITY_TIERS.outer },
      { tier: 'distant', ...PROXIMITY_TIERS.distant },
    ];
  }, []);

  // Validate props after all hooks have been called
  if (!proximityGroups || !is.object(proximityGroups)) {
    logger.error('RadarVisualization', 'render', new Error('proximityGroups is required'));
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* SVG Layer for rings */}
      <Svg
        width={screenWidth}
        height={screenHeight}
        viewBox={`${-screenWidth / 2} ${-screenHeight / 2} ${screenWidth} ${screenHeight}`}
        style={styles.svgContainer}
      >
        {/* Pulsing rings (behind everything) */}
        {enablePulse && (
          <PulseRings
            maxRadius={maxRadius}
            numRings={3}
            duration={4000}
            color={theme.colors.primary}
          />
        )}

        {/* Static tier rings */}
        {tierRings.map(({ tier, color }) => {
          const radius = maxRadius * (
            tier === 'inner' ? 0.25 :
            tier === 'middle' ? 0.50 :
            tier === 'outer' ? 0.75 :
            1.00
          );

          return (
            <RadarRing
              key={`ring-${tier}`}
              tier={tier}
              radius={radius}
              color={color}
              opacity={0.3}
              strokeWidth={1.5}
            />
          );
        })}
      </Svg>

      {/* Contact nodes layer (absolute positioning) */}
      <View style={styles.nodesContainer}>
        {allPositions.map(({ contact, x, y, radius }) => (
          <RadialNode
            key={`node-${contact.id}`}
            contact={contact}
            x={centerX + x}
            y={centerY + y}
            score={contact.proximityScore || 0}
            tier={contact.tier}
            onPress={onContactPress}
            showScore={showScores}
            size={48}
          />
        ))}
      </View>

      {/* Center indicator (optional) */}
      <View style={[styles.centerDot, {
        left: centerX - 4,
        top: centerY - 4,
        backgroundColor: theme.colors.primary,
      }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  svgContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  nodesContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  centerDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.5,
  },
});
