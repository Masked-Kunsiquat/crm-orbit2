/**
 * ProximityRadarScreen
 *
 * Radar visualization mode for relationship proximity.
 * Displays contacts as floating avatars on concentric rings.
 *
 * @module screens/ProximityRadarScreen
 */

import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Appbar,
  ActivityIndicator,
  useTheme,
  IconButton,
  Text,
  Dialog,
  Portal,
  Button,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import RadarVisualization from '../components/RadarVisualization';
import { useProximityData } from '../hooks/queries/useProximityQueries';
import { logger } from '../errors/utils/errorLogger';

/**
 * ProximityRadarScreen - Radar view wrapper
 *
 * @param {object} navigation - React Navigation object
 * @param {object} route - Route parameters
 */
export default function ProximityRadarScreen({ navigation }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = getStyles(theme);
  const [showInfoDialog, setShowInfoDialog] = useState(false);

  // Fetch proximity data (reuses existing hook from list view)
  const {
    data: proximityGroups,
    isLoading,
    error,
    refetch,
  } = useProximityData();

  // Fallback to empty groups if data not loaded yet
  const groups = proximityGroups || {
    inner: [],
    middle: [],
    outer: [],
    distant: [],
  };

  // Calculate total contact count
  const totalContacts = Object.values(groups).reduce(
    (sum, contacts) => sum + contacts.length,
    0
  );

  // Handle contact press → navigate to detail screen
  const handleContactPress = useCallback(
    (contact) => {
      logger.success('ProximityRadarScreen', 'handleContactPress', {
        contactId: contact.id,
      });

      navigation.navigate('ContactDetail', { contactId: contact.id });
    },
    [navigation]
  );

  // Handle toggle back to list view
  const handleToggleView = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Handle info button press
  const handleInfoPress = useCallback(() => {
    setShowInfoDialog(true);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title={t('proximity.radarTitle')} />
        </Appbar.Header>

        <View style={styles.centerContent}>
          <ActivityIndicator size="large" />
          <Text variant="bodyMedium" style={styles.loadingText}>
            {t('proximity.loading')}
          </Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title={t('proximity.radarTitle')} />
        </Appbar.Header>

        <View style={styles.centerContent}>
          <Text variant="headlineSmall" style={styles.errorTitle}>
            {t('errors.generic')}
          </Text>
          <Text variant="bodyMedium" style={styles.errorMessage}>
            {error?.message || t('errors.unknown')}
          </Text>
          <IconButton
            icon="refresh"
            mode="contained"
            onPress={() => refetch()}
            style={styles.retryButton}
          />
        </View>
      </View>
    );
  }

  // Empty state
  if (totalContacts === 0) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title={t('proximity.radarTitle')} />
          <Appbar.Action icon="format-list-bulleted" onPress={handleToggleView} />
          <Appbar.Action icon="information-outline" onPress={handleInfoPress} />
        </Appbar.Header>

        <View style={styles.centerContent}>
          <Text variant="displaySmall" style={styles.emptyEmoji}>
            🎯
          </Text>
          <Text variant="headlineSmall" style={styles.emptyTitle}>
            {t('proximity.noContacts')}
          </Text>
          <Text variant="bodyMedium" style={styles.emptyMessage}>
            {t('proximity.noContactsMessage')}
          </Text>
        </View>
      </View>
    );
  }

  // Main radar view
  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={t('proximity.radarTitle')} />
        <Appbar.Action icon="format-list-bulleted" onPress={handleToggleView} />
        <Appbar.Action icon="information-outline" onPress={handleInfoPress} />
      </Appbar.Header>

      <RadarVisualization
        proximityGroups={groups}
        onContactPress={handleContactPress}
        showScores={false}
        enablePulse={false}
        padding={40}
      />

      <Portal>
        <Dialog visible={showInfoDialog} onDismiss={() => setShowInfoDialog(false)}>
          <Dialog.Title>{t('proximity.radarInfo.title')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogText}>
              {t('proximity.radarInfo.message')}
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

function getStyles(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    centerContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    loadingText: {
      marginTop: 16,
      color: theme.colors.onSurfaceVariant,
    },
    errorTitle: {
      marginBottom: 8,
      color: theme.colors.error,
      textAlign: 'center',
    },
    errorMessage: {
      marginBottom: 24,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
    },
    retryButton: {
      marginTop: 8,
    },
    emptyEmoji: {
      fontSize: 80,
      marginBottom: 16,
    },
    emptyTitle: {
      marginBottom: 8,
      color: theme.colors.onSurface,
      textAlign: 'center',
    },
    emptyMessage: {
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      maxWidth: 300,
    },
    dialogText: {
      marginBottom: 12,
      lineHeight: 20,
    },
  });
}
