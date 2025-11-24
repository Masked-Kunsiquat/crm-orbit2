import React, { useMemo, useState } from 'react';
import { StyleSheet, SectionList, View } from 'react-native';
import {
  Appbar,
  Text,
  Card,
  Chip,
  useTheme,
  ActivityIndicator,
  Dialog,
  Portal,
  Button,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import ContactAvatar from '../components/ContactAvatar';
import { EmptyState } from '../components/layout';
import { getContactDisplayName } from '../utils/contactHelpers';
import { useProximityData } from '../hooks/queries';
import { getTierDetails } from '../constants/proximityDefaults';

export default function ProximityScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [showInfoDialog, setShowInfoDialog] = useState(false);

  // Fetch proximity-grouped data
  const { data: proximityGroups, isLoading, error, refetch } = useProximityData();

  // Convert grouped object to sections array for SectionList
  const sections = useMemo(() => {
    if (!proximityGroups) return [];

    const tierOrder = ['inner', 'middle', 'outer', 'distant'];
    // Representative scores for each tier (used for getting tier metadata)
    const tierScores = { inner: 85, middle: 60, outer: 40, distant: 15 };

    return tierOrder
      .map(tierKey => {
        const contacts = proximityGroups[tierKey] || [];
        const tierInfo = getTierDetails(tierScores[tierKey]);

        return {
          tierKey,
          title: tierInfo.label,
          emoji: tierInfo.emoji,
          color: tierInfo.color,
          data: contacts,
        };
      })
      .filter(section => section.data.length > 0); // Hide empty tiers
  }, [proximityGroups]);

  const handleContactPress = contact => {
    navigation.navigate('ContactDetail', { contactId: contact.id });
  };

  const styles = getStyles(theme);

  const renderSectionHeader = ({ section }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.colors.background }]}>
      <View style={styles.sectionHeaderContent}>
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: section.color }]}>
          {section.emoji} {section.title.toUpperCase()}
        </Text>
        <Chip
          compact
          mode="flat"
          style={[styles.countChip, { backgroundColor: section.color + '20' }]}
          textStyle={[styles.countText, { color: section.color }]}
        >
          {section.data.length}
        </Chip>
      </View>
    </View>
  );

  const renderContact = ({ item: contact }) => {
    const score = contact.proximityScore || 0;
    const tierInfo = getTierDetails(score);

    return (
      <Card
        style={styles.contactCard}
        onPress={() => handleContactPress(contact)}
      >
        <Card.Content style={styles.cardContent}>
          <ContactAvatar contact={contact} size={48} style={styles.avatar} />

          <View style={styles.contactInfo}>
            <Text variant="titleMedium" style={styles.contactName}>
              {getContactDisplayName(contact)}
            </Text>
          </View>

          <View style={styles.scoreContainer}>
            <View
              style={[
                styles.scoreBadge,
                { backgroundColor: tierInfo.color },
              ]}
            >
              <Text variant="labelLarge" style={styles.scoreText}>
                {Math.round(score)}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text variant="bodyLarge" style={styles.loadingText}>
            {t('proximity.calculating')}
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <EmptyState
          icon="alert-circle-outline"
          title={t('proximity.errorTitle')}
          message={t('proximity.errorMessage')}
          actionLabel={t('proximity.retry')}
          onAction={refetch}
        />
      );
    }

    return (
      <EmptyState
        icon="account-multiple-outline"
        title={t('proximity.emptyTitle')}
        message={t('proximity.emptyMessage')}
      />
    );
  };

  return (
    <View style={styles.container}>
      <Appbar.Header elevated>
        <Appbar.Content title={t('proximity.title')} />
        <Appbar.Action
          icon="information-outline"
          onPress={() => setShowInfoDialog(true)}
        />
      </Appbar.Header>

      <SectionList
        sections={sections}
        renderItem={renderContact}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={sections.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={renderEmpty}
        stickySectionHeadersEnabled
        onRefresh={refetch}
        refreshing={isLoading}
      />

      <Portal>
        <Dialog visible={showInfoDialog} onDismiss={() => setShowInfoDialog(false)}>
          <Dialog.Title>{t('proximity.infoTitle')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogText}>
              {t('proximity.infoMessage')}
            </Text>
            <Text variant="bodyMedium" style={styles.dialogText}>
              {t('proximity.infoScoring')}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowInfoDialog(false)}>
              {t('proximity.gotIt')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

// Theme-aware styles
function getStyles(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    listContent: {
      paddingBottom: 16,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    loadingText: {
      marginTop: 16,
      color: theme.colors.onSurfaceVariant,
    },
    sectionHeader: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
    },
    sectionHeaderContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sectionTitle: {
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    countChip: {
      height: 24,
    },
    countText: {
      fontSize: 12,
      fontWeight: '600',
    },
    contactCard: {
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
    scoreBadge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 2,
    },
    scoreText: {
      color: theme.colors.onPrimary,
      fontWeight: '700',
    },
    dialogText: {
      marginBottom: 12,
      lineHeight: 20,
    },
  });
}
