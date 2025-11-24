import React, { useMemo, useState, useCallback } from 'react';
import { StyleSheet, SectionList, View } from 'react-native';
import {
  Appbar,
  Text,
  useTheme,
  ActivityIndicator,
  Dialog,
  Portal,
  Button,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import ContactProximityCard from '../components/ContactProximityCard';
import TierHeader from '../components/TierHeader';
import { EmptyState } from '../components/layout';
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

  // Memoized callback for contact press to prevent unnecessary re-renders
  const handleContactPress = useCallback(
    contact => {
      navigation.navigate('ContactDetail', { contactId: contact.id });
    },
    [navigation]
  );

  // Handle toggle to radar view
  const handleToggleRadarView = useCallback(() => {
    navigation.navigate('ProximityRadar');
  }, [navigation]);

  const styles = getStyles(theme);

  const renderSectionHeader = ({ section }) => (
    <TierHeader
      emoji={section.emoji}
      title={section.title}
      color={section.color}
      count={section.data.length}
    />
  );

  const renderContact = ({ item: contact }) => (
    <ContactProximityCard
      contact={contact}
      onPress={handleContactPress}
    />
  );

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
          icon="radar"
          onPress={handleToggleRadarView}
        />
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
    dialogText: {
      marginBottom: 12,
      lineHeight: 20,
    },
  });
}
