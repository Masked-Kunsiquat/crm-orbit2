import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Appbar,
  Text,
  RadioButton,
  useTheme,
  Card,
  Divider,
  Button,
  ActivityIndicator,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { showAlert, logger } from '../errors';
import database from '../database';
import { PROXIMITY_PRESETS, DEFAULT_PRESET } from '../constants/proximityDefaults';

export default function ProximitySettingsScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useTranslation();

  const [selectedPreset, setSelectedPreset] = useState(DEFAULT_PRESET);
  const [initialPreset, setInitialPreset] = useState(DEFAULT_PRESET);
  const [customWeights, setCustomWeights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const styles = getStyles(theme);

  // Load current setting and custom weights
  useEffect(() => {
    loadCurrentPreset();
  }, []);

  const loadCurrentPreset = async () => {
    try {
      const [presetSetting, customWeightsSetting] = await Promise.all([
        database.settings.get('proximity.preset'),
        database.settings.get('proximity.customWeights'),
      ]);

      const preset = presetSetting?.value || DEFAULT_PRESET;
      const weights = customWeightsSetting?.value || null;

      setSelectedPreset(preset);
      setInitialPreset(preset);
      setCustomWeights(weights);

      logger.success('ProximitySettings', 'loadCurrentPreset', { preset, hasCustomWeights: !!weights });
    } catch (error) {
      logger.error('ProximitySettings', 'loadCurrentPreset', error);
      showAlert.error(
        t('proximitySettings.loadError'),
        t('proximitySettings.loadErrorMessage')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      await database.settings.set('proximity.preset', selectedPreset);

      // Update initial preset to reflect saved state
      setInitialPreset(selectedPreset);

      logger.success('ProximitySettings', 'handleSave', {
        preset: selectedPreset,
      });

      showAlert.success(
        t('proximitySettings.saved'),
        t('proximitySettings.savedMessage')
      );

      // Navigate back
      navigation.goBack();
    } catch (error) {
      logger.error('ProximitySettings', 'handleSave', error);
      showAlert.error(
        t('proximitySettings.saveError'),
        t('proximitySettings.saveErrorMessage')
      );
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = useMemo(() => {
    // Check if current selection differs from initially loaded preset
    return selectedPreset !== initialPreset;
  }, [selectedPreset, initialPreset]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Appbar.Header elevated>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title={t('proximitySettings.title')} />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={t('proximitySettings.title')} />
      </Appbar.Header>

      <ScrollView style={styles.scrollView}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t('proximitySettings.algorithmTitle')}
            </Text>
            <Text variant="bodyMedium" style={styles.description}>
              {t('proximitySettings.algorithmDescription')}
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t('proximitySettings.presetTitle')}
            </Text>

            <RadioButton.Group
              onValueChange={value => setSelectedPreset(value)}
              value={selectedPreset}
            >
              {Object.keys(PROXIMITY_PRESETS).map(presetKey => {
                const preset = PROXIMITY_PRESETS[presetKey];
                const isSelected = selectedPreset === presetKey;

                // For custom preset, use loaded weights or show placeholder
                const weights = presetKey === 'custom' ? customWeights : preset.weights;
                const hasWeights = weights !== null;

                return (
                  <View key={presetKey}>
                    <RadioButton.Item
                      label={preset.name}
                      value={presetKey}
                      status={isSelected ? 'checked' : 'unchecked'}
                      labelStyle={styles.radioLabel}
                    />
                    <Text
                      variant="bodySmall"
                      style={[
                        styles.presetDescription,
                        isSelected && styles.presetDescriptionSelected,
                      ]}
                    >
                      {preset.description}
                    </Text>
                    {isSelected && hasWeights && (
                      <View style={styles.weightsContainer}>
                        <Text variant="labelSmall" style={styles.weightsTitle}>
                          {t('proximitySettings.weights')}:
                        </Text>
                        <Text variant="bodySmall" style={styles.weightsText}>
                          {t('proximitySettings.recency')}: {Math.round(weights.recency * 100)}%
                          {' • '}
                          {t('proximitySettings.frequency')}: {Math.round(weights.frequency * 100)}%
                          {' • '}
                          {t('proximitySettings.quality')}: {Math.round(weights.quality * 100)}%
                          {' • '}
                          {t('proximitySettings.contactType')}: {Math.round(weights.contactType * 100)}%
                        </Text>
                      </View>
                    )}
                    {isSelected && !hasWeights && presetKey === 'custom' && (
                      <View style={styles.weightsContainer}>
                        <Text variant="bodySmall" style={styles.weightsText}>
                          {t('proximitySettings.customNotConfigured')}
                        </Text>
                      </View>
                    )}
                    {presetKey !== Object.keys(PROXIMITY_PRESETS)[Object.keys(PROXIMITY_PRESETS).length - 1] && (
                      <Divider style={styles.divider} />
                    )}
                  </View>
                );
              })}
            </RadioButton.Group>
          </Card.Content>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            style={styles.saveButton}
          >
            {t('proximitySettings.save')}
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

function getStyles(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollView: {
      flex: 1,
    },
    card: {
      margin: 16,
      marginBottom: 0,
    },
    sectionTitle: {
      fontWeight: '600',
      marginBottom: 8,
    },
    description: {
      color: theme.colors.onSurfaceVariant,
      lineHeight: 20,
    },
    radioLabel: {
      fontWeight: '500',
    },
    presetDescription: {
      marginLeft: 56,
      marginTop: -8,
      marginBottom: 12,
      color: theme.colors.onSurfaceVariant,
      fontSize: 13,
    },
    presetDescriptionSelected: {
      color: theme.colors.primary,
    },
    weightsContainer: {
      marginLeft: 56,
      marginBottom: 12,
      padding: 12,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 8,
    },
    weightsTitle: {
      fontWeight: '600',
      marginBottom: 4,
      color: theme.colors.onSurfaceVariant,
    },
    weightsText: {
      color: theme.colors.onSurfaceVariant,
      lineHeight: 18,
    },
    divider: {
      marginVertical: 8,
    },
    buttonContainer: {
      padding: 16,
    },
    saveButton: {
      paddingVertical: 6,
    },
  });
}
