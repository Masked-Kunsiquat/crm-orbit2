import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';
import ContactAvatar from './ContactAvatar';
import ScoreBadge from './ScoreBadge';
import { getContactDisplayName } from '../utils/contactHelpers';

/**
 * ContactProximityCard - Contact card with proximity score badge
 *
 * Optimized with React.memo to prevent unnecessary re-renders in lists
 *
 * @param {object} contact - Contact object with proximityScore
 * @param {function} onPress - Callback when card is pressed
 */
function ContactProximityCard({ contact, onPress }) {
  const score = contact.proximityScore || 0;

  return (
    <Card style={styles.card} onPress={onPress}>
      <Card.Content style={styles.cardContent}>
        <ContactAvatar contact={contact} size={48} style={styles.avatar} />

        <View style={styles.contactInfo}>
          <Text variant="titleMedium" style={styles.contactName}>
            {getContactDisplayName(contact)}
          </Text>
        </View>

        <View style={styles.scoreContainer}>
          <ScoreBadge score={score} size="medium" />
        </View>
      </Card.Content>
    </Card>
  );
}

// Memoize to prevent unnecessary re-renders
// Only re-render if contact ID, proximityScore, or onPress changes
export default React.memo(ContactProximityCard, (prevProps, nextProps) => {
  return (
    prevProps.contact.id === nextProps.contact.id &&
    prevProps.contact.proximityScore === nextProps.contact.proximityScore &&
    prevProps.onPress === nextProps.onPress
  );
});

const styles = StyleSheet.create({
  card: {
    marginVertical: 4,
    marginHorizontal: 16,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatar: {
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  scoreContainer: {
    marginLeft: 12,
  },
});
