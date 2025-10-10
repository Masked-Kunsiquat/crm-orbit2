import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, Avatar, Chip } from 'react-native-paper';

export default function ContactCard({ contact, onPress }) {
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
            </View>
          </View>
          <View style={styles.rightSection}>
            {contact.categories && contact.categories.length > 0 && (
              <View style={styles.topCategories}>
                {contact.categories.slice(0, 2).map((category, index) => (
                  <Chip
                    key={index}
                    compact
                    mode="outlined"
                    style={[styles.categoryChipOutline, { borderColor: category.color || '#90caf9' }]}
                    textStyle={[styles.categoryTextOutline, { color: category.color || '#1976d2' }]}
                  >
                    {category.name}
                  </Chip>
                ))}
                {contact.categories.length > 2 && (
                  <Chip compact mode="outlined" style={styles.moreChipOutline} textStyle={styles.moreChipText}>
                    +{contact.categories.length - 2}
                  </Chip>
                )}
              </View>
            )}
          </View>
        </View>
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
  rightSection: {
    flexShrink: 1,
    marginLeft: 8,
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
  // Actions removed
  topCategories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  categoryChipOutline: {
    marginVertical: 2,
    backgroundColor: 'transparent',
    borderWidth: 1,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  categoryTextOutline: {
    fontSize: 12,
    lineHeight: 18,
  },
  moreChipOutline: {
    marginVertical: 2,
    backgroundColor: 'transparent',
    borderColor: '#ddd',
    borderWidth: 1,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  moreChipText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#666',
  },
});
