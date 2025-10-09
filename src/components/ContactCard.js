import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, Avatar, Chip, IconButton } from 'react-native-paper';

export default function ContactCard({ contact, onPress, onCall, onMessage, onEmail }) {
  const getInitials = (firstName, lastName) => {
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last || '?';
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    // Simple formatting for display
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  return (
    <Card style={styles.card} onPress={onPress}>
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.leftSection}>
            <Avatar.Text
              size={48}
              label={getInitials(contact.first_name, contact.last_name)}
              style={styles.avatar}
            />
            <View style={styles.info}>
              <Text variant="titleMedium" style={styles.name}>
                {contact.display_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown Contact'}
              </Text>
              {contact.company_name && (
                <Text variant="bodySmall" style={styles.company}>
                  {contact.company_name}
                </Text>
              )}
              {contact.phone && (
                <Text variant="bodySmall" style={styles.phone}>
                  {formatPhoneNumber(contact.phone)}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.actions}>
            {onMessage && contact.phone && (
              <IconButton
                icon="message-text"
                size={20}
                onPress={() => onMessage(contact)}
                style={styles.actionButton}
              />
            )}
            {onCall && contact.phone && (
              <IconButton
                icon="phone"
                size={20}
                onPress={() => onCall(contact)}
                style={styles.actionButton}
              />
            )}
            {onEmail && contact.email && (
              <IconButton
                icon="email"
                size={20}
                onPress={() => onEmail(contact)}
                style={styles.actionButton}
              />
            )}
          </View>
        </View>

        {contact.categories && contact.categories.length > 0 && (
          <View style={styles.categories}>
            {contact.categories.slice(0, 3).map((category, index) => (
              <Chip
                key={index}
                compact
                style={[styles.categoryChip, { backgroundColor: category.color || '#e3f2fd' }]}
                textStyle={styles.categoryText}
              >
                {category.name}
              </Chip>
            ))}
            {contact.categories.length > 3 && (
              <Chip compact style={styles.moreChip}>
                +{contact.categories.length - 3}
              </Chip>
            )}
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 4,
    marginHorizontal: 16,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leftSection: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'flex-start',
  },
  avatar: {
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontWeight: '600',
    marginBottom: 2,
  },
  company: {
    color: '#666',
    marginBottom: 2,
  },
  phone: {
    color: '#888',
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    margin: 0,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  categoryChip: {
    height: 24,
  },
  categoryText: {
    fontSize: 11,
  },
  moreChip: {
    height: 24,
    backgroundColor: '#f5f5f5',
  },
});