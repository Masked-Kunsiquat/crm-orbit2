import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import ContactAvatar from './ContactAvatar';
import { getContactDisplayName } from '../utils/contactHelpers';

export default function ContactCard({ contact, onPress }) {
  const { t } = useTranslation();

  return (
    <Card style={styles.card} onPress={onPress}>
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.leftSection}>
            <ContactAvatar contact={contact} size={48} style={styles.avatar} />
            <View style={styles.info}>
              <Text variant="titleMedium" style={styles.name}>
                {getContactDisplayName(contact)}
              </Text>
              {(() => {
                const companyName = contact.company?.name || contact.company_name;
                const job = contact.job_title;
                if (!companyName && !job) return null;
                const line = job && companyName ? `${job} at ${companyName}` : (job || companyName);
                return (
                  <Text variant="bodySmall" style={styles.company}>
                    {line}
                  </Text>
                );
              })()}
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
                    {(() => {
                      const key = `categories.${category.name}`;
                      const translated = t(key);
                      return translated === key ? category.name : translated;
                    })()}
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
    marginVertical: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    paddingVertical: 0,
    paddingHorizontal: 6,
  },
  categoryTextOutline: {
    fontSize: 12,
    lineHeight: 14,
  },
  moreChipOutline: {
    marginVertical: 1,
    backgroundColor: 'transparent',
    borderColor: '#ddd',
    borderWidth: 1,
    paddingVertical: 0,
    paddingHorizontal: 6,
  },
  moreChipText: {
    fontSize: 12,
    lineHeight: 14,
    color: '#666',
  },
});
