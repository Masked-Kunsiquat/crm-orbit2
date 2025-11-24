import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { showAlert, logger } from '../errors';
import {
  Appbar,
  Searchbar,
  Text,
  List,
  Divider,
  Switch,
  Portal,
  Dialog,
  Button,
  useTheme,
  RadioButton,
  SegmentedButtons,
} from 'react-native-paper';
import { useSettings } from '../context/SettingsContext';
import authService from '../services/authService';
import database from '../database';
import { resetDatabase } from '../database/resetDb';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

// Section search terms mapping
const SECTION_SEARCH_TERMS = {
  appearance: ['appearance', 'theme', 'dark', 'light', 'color'],
  security: ['security', 'pin', 'biometric', 'lock', 'password', 'fingerprint'],
  language: ['language', 'english', 'spanish', 'french', 'german', 'chinese'],
  features: ['features', 'company', 'management'],
  swipe: ['swipe', 'actions', 'call', 'text', 'gesture'],
  proximity: ['proximity', 'relationship', 'algorithm', 'scoring', 'insights'],
  data: ['data', 'database', 'migrations', 'reset', 'backup'],
};

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const theme = useTheme();

  const {
    leftAction,
    rightAction,
    setMapping,
    themeMode,
    setThemeMode,
    language,
    setLanguage,
    companyManagementEnabled,
    setCompanyManagementEnabled,
  } = useSettings();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Section expansion states
  const [expandedSections, setExpandedSections] = useState({
    appearance: false,
    security: false,
    features: false,
    swipe: false,
    language: false,
    proximity: false,
    data: false,
  });

  // Loading states
  const [runningMigrations, setRunningMigrations] = useState(false);
  const [resettingDatabase, setResettingDatabase] = useState(false);

  // Dialog states
  const [successDialogVisible, setSuccessDialogVisible] = useState(false);
  const [successDialogMessage, setSuccessDialogMessage] = useState('');

  // Biometric and auto-lock states
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [autoLockEnabled, setAutoLockEnabled] = useState(false);
  const [autoLockTimeout, setAutoLockTimeout] = useState(5);

  React.useEffect(() => {
    (async () => {
      setBiometricEnabled(await authService.isBiometricEnabled());
      setAutoLockEnabled(await authService.isAutoLockEnabled());
      try {
        const timeout = await authService.getAutoLockTimeout();
        if (Number.isFinite(timeout) && timeout > 0) {
          setAutoLockTimeout(timeout);
        }
      } catch (e) {
        // Keep default on failure
      }
    })();
  }, []);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const toggleBiometric = async () => {
    const prev = biometricEnabled;
    try {
      if (prev) {
        const ok = await authService.disableBiometric();
        if (!ok) throw new Error('disableBiometric failed');
        setBiometricEnabled(false);
      } else {
        const ok = await authService.enableBiometric();
        if (!ok) throw new Error('enableBiometric failed');
        setBiometricEnabled(true);
      }
    } catch (e) {
      logger.error('SettingsScreen', 'toggleBiometric', e);
      setBiometricEnabled(prev);
      showAlert.error(
        t('settings.errors.biometricToggle.title'),
        t('settings.errors.biometricToggle.message')
      );
    }
  };

  const toggleAutoLock = async () => {
    const prev = autoLockEnabled;
    try {
      if (prev) {
        const ok = await authService.disableAutoLock();
        if (!ok) throw new Error('disableAutoLock failed');
        setAutoLockEnabled(false);
      } else {
        const ok = await authService.enableAutoLock(autoLockTimeout);
        if (!ok) throw new Error('enableAutoLock failed');
        setAutoLockEnabled(true);
      }
    } catch (e) {
      logger.error('SettingsScreen', 'toggleAutoLock', e);
      setAutoLockEnabled(prev);
      showAlert.error(
        t('settings.errors.autoLockToggle.title'),
        t('settings.errors.autoLockToggle.message')
      );
    }
  };

  const changeAutoLockTimeout = async (minutes) => {
    const prev = autoLockTimeout;
    setAutoLockTimeout(minutes);
    if (autoLockEnabled) {
      try {
        const ok = await authService.enableAutoLock(minutes);
        if (!ok) throw new Error('enableAutoLock (update timeout) failed');
      } catch (e) {
        logger.error('SettingsScreen', 'changeAutoLockTimeout', e);
        setAutoLockTimeout(prev);
        showAlert.error(
          t('settings.errors.autoLockTimeout.title'),
          t('settings.errors.autoLockTimeout.message')
        );
      }
    }
  };

  const onSelectCall = async (side) => {
    try {
      if (side === 'left') await setMapping('call', 'text');
      else await setMapping('text', 'call');
    } catch (error) {
      logger.error('SettingsScreen', 'onSelectCall', error);
      showAlert.error(
        t('settings.errors.swipeAction.title'),
        t('settings.errors.swipeAction.message')
      );
    }
  };

  const onSelectText = async (side) => {
    try {
      if (side === 'left') await setMapping('text', 'call');
      else await setMapping('call', 'text');
    } catch (error) {
      logger.error('SettingsScreen', 'onSelectText', error);
      showAlert.error(
        t('settings.errors.swipeAction.title'),
        t('settings.errors.swipeAction.message')
      );
    }
  };

  const handleThemeChange = async (mode) => {
    try {
      await setThemeMode(mode);
    } catch (error) {
      logger.error('SettingsScreen', 'handleThemeChange', error);
      showAlert.error(
        t('settings.errors.theme.title'),
        t('settings.errors.theme.message')
      );
    }
  };

  const handleLanguageChange = async (lang) => {
    try {
      await setLanguage(lang);
    } catch (error) {
      logger.error('SettingsScreen', 'handleLanguageChange', error);
      showAlert.error(
        t('settings.errors.language.title'),
        t('settings.errors.language.message')
      );
    }
  };

  const handleRunMigrations = async () => {
    setRunningMigrations(true);
    try {
      await database.runPendingMigrations();
      showAlert.success(
        t('settings.database.migrationsSuccess'),
        t('settings.database.migrationsComplete')
      );
      logger.success('SettingsScreen', 'handleRunMigrations', 'Migrations completed');
    } catch (error) {
      logger.error('SettingsScreen', 'handleRunMigrations', error);
      showAlert.error(
        t('settings.database.migrationsError'),
        error.message || t('settings.database.migrationsFailed')
      );
    } finally {
      setRunningMigrations(false);
    }
  };

  const handleResetDatabase = async () => {
    showAlert.confirmDelete(
      t('settings.database.resetTitle'),
      t('settings.database.resetWarning'),
      async () => {
        setResettingDatabase(true);
        try {
          const db = database.getDB();
          await resetDatabase(db);
          showAlert.success(
            t('settings.database.resetSuccess'),
            t('settings.database.resetComplete')
          );
          logger.success('SettingsScreen', 'handleResetDatabase', 'Database reset');
        } catch (error) {
          logger.error('SettingsScreen', 'handleResetDatabase', error);
          showAlert.error(
            t('settings.database.resetError'),
            error.message || t('settings.database.resetFailed')
          );
        } finally {
          setResettingDatabase(false);
        }
      }
    );
  };

  // Filter sections based on search query
  const shouldShowSection = (sectionKey) => {
    if (!searchQuery) return true;

    const searchTerms = SECTION_SEARCH_TERMS[sectionKey] || [];
    const query = searchQuery.toLowerCase();
    return searchTerms.some(term => term.toLowerCase().includes(query));
  };

  return (
    <View style={styles.container}>
      <Appbar.Header elevated>
        <Appbar.Content title={t('settings.title')} />
      </Appbar.Header>

      <ScrollView style={styles.scrollView}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder={t('settings.searchPlaceholder')}
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
            elevation={1}
          />
        </View>

        {/* Appearance Section */}
        {shouldShowSection('appearance') && (
          <List.Section style={styles.section}>
            <List.Accordion
              title={t('settings.sections.appearance')}
              left={props => <List.Icon {...props} icon="palette-outline" />}
              expanded={expandedSections.appearance}
              onPress={() => toggleSection('appearance')}
            >
              <View style={styles.segmentedButtonContainer}>
                <Text variant="labelLarge" style={styles.settingLabel}>
                  {t('settings.appearance.theme')}
                </Text>
                <SegmentedButtons
                  value={themeMode}
                  onValueChange={handleThemeChange}
                  buttons={[
                    {
                      value: 'light',
                      label: t('labels.light'),
                      icon: 'white-balance-sunny',
                    },
                    {
                      value: 'dark',
                      label: t('labels.dark'),
                      icon: 'moon-waning-crescent',
                    },
                    {
                      value: 'system',
                      label: t('labels.system'),
                      icon: 'cellphone',
                    },
                  ]}
                />
              </View>
            </List.Accordion>
          </List.Section>
        )}

        <Divider />

        {/* Security Section */}
        {shouldShowSection('security') && (
          <List.Section style={styles.section}>
            <List.Accordion
              title={t('settings.sections.security')}
              description={t('settings.sections.securityDescription')}
              left={props => <List.Icon {...props} icon="shield-lock-outline" />}
              expanded={expandedSections.security}
              onPress={() => toggleSection('security')}
            >
              <List.Item
                title={t('settings.security.pinSetup')}
                description={t('settings.security.pinDescription')}
                left={props => <List.Icon {...props} icon="key-variant" />}
                onPress={() => navigation.navigate('PinSetup')}
                right={props => <List.Icon {...props} icon="chevron-right" />}
              />

              <List.Item
                title={t('settings.security.useBiometric')}
                description={t('settings.security.biometricDescription')}
                left={props => <List.Icon {...props} icon="fingerprint" />}
                right={() => (
                  <Switch
                    value={biometricEnabled}
                    onValueChange={toggleBiometric}
                  />
                )}
              />

              <List.Item
                title={t('settings.security.autoLock', { minutes: autoLockTimeout })}
                description={t('settings.security.autoLockDescription')}
                left={props => <List.Icon {...props} icon="lock-clock" />}
                right={() => (
                  <Switch
                    value={autoLockEnabled}
                    onValueChange={toggleAutoLock}
                  />
                )}
              />

              {autoLockEnabled && (
                <View style={styles.radioGroupContainer}>
                  <Text variant="labelMedium" style={styles.radioGroupLabel}>
                    {t('settings.security.autoLockTimeout')}
                  </Text>
                  <RadioButton.Group
                    onValueChange={value => changeAutoLockTimeout(parseInt(value))}
                    value={autoLockTimeout.toString()}
                  >
                    {[1, 5, 10, 30].map(minutes => (
                      <RadioButton.Item
                        key={minutes}
                        label={t('settings.security.minutes', { count: minutes })}
                        value={minutes.toString()}
                        position="leading"
                      />
                    ))}
                  </RadioButton.Group>
                </View>
              )}
            </List.Accordion>
          </List.Section>
        )}

        <Divider />

        {/* Language Section */}
        {shouldShowSection('language') && (
          <List.Section style={styles.section}>
            <List.Accordion
              title={t('settings.sections.language')}
              description={t('settings.sections.languageDescription')}
              left={props => <List.Icon {...props} icon="translate" />}
              expanded={expandedSections.language}
              onPress={() => toggleSection('language')}
            >
              <RadioButton.Group onValueChange={handleLanguageChange} value={language}>
                <RadioButton.Item
                  label={t('settings.language.device')}
                  value="device"
                  position="leading"
                />
                <RadioButton.Item
                  label={t('settings.language.english')}
                  value="en"
                  position="leading"
                />
                <RadioButton.Item
                  label={t('settings.language.spanish')}
                  value="es"
                  position="leading"
                />
                <RadioButton.Item
                  label={t('settings.language.french')}
                  value="fr"
                  position="leading"
                />
                <RadioButton.Item
                  label={t('settings.language.german')}
                  value="de"
                  position="leading"
                />
                <RadioButton.Item
                  label={t('settings.language.chinese')}
                  value="zh"
                  position="leading"
                />
              </RadioButton.Group>
            </List.Accordion>
          </List.Section>
        )}

        <Divider />

        {/* Features Section */}
        {shouldShowSection('features') && (
          <List.Section style={styles.section}>
            <List.Accordion
              title={t('settings.sections.features')}
              description={t('settings.sections.featuresDescription')}
              left={props => <List.Icon {...props} icon="tune-variant" />}
              expanded={expandedSections.features}
              onPress={() => toggleSection('features')}
            >
              <List.Item
                title={t('settings.features.companyManagement.title')}
                description={t('settings.features.companyManagement.description')}
                left={props => <List.Icon {...props} icon="domain" />}
                right={() => (
                  <Switch
                    value={companyManagementEnabled}
                    onValueChange={async value => {
                      try {
                        await setCompanyManagementEnabled(value);
                        setSuccessDialogMessage(
                          value
                            ? t('settings.features.companyManagement.enabled')
                            : t('settings.features.companyManagement.disabled')
                        );
                        setSuccessDialogVisible(true);
                      } catch (error) {
                        logger.error('SettingsScreen', 'toggleCompanyManagement', error);
                        showAlert.error(
                          t('settings.errors.featureToggle.title'),
                          t('settings.errors.featureToggle.message')
                        );
                      }
                    }}
                  />
                )}
              />
            </List.Accordion>
          </List.Section>
        )}

        <Divider />

        {/* Swipe Actions Section */}
        {shouldShowSection('swipe') && (
          <List.Section style={styles.section}>
            <List.Accordion
              title={t('settings.sections.swipe')}
              description={t('settings.sections.swipeDescription')}
              left={props => <List.Icon {...props} icon="gesture-swipe-horizontal" />}
              expanded={expandedSections.swipe}
              onPress={() => toggleSection('swipe')}
            >
              <List.Item
                title={t('labels.call')}
                left={props => <List.Icon {...props} icon="phone" />}
                right={() => (
                  <View style={styles.swipeActionRow}>
                    <View style={styles.swipeOption}>
                      <Text variant="labelSmall" style={styles.swipeLabel}>
                        {t('labels.left')}
                      </Text>
                      <RadioButton
                        value="call-left"
                        status={leftAction === 'call' ? 'checked' : 'unchecked'}
                        onPress={() => onSelectCall('left')}
                      />
                    </View>
                    <View style={styles.swipeOption}>
                      <Text variant="labelSmall" style={styles.swipeLabel}>
                        {t('labels.right')}
                      </Text>
                      <RadioButton
                        value="call-right"
                        status={rightAction === 'call' ? 'checked' : 'unchecked'}
                        onPress={() => onSelectCall('right')}
                      />
                    </View>
                  </View>
                )}
              />

              <List.Item
                title={t('labels.text')}
                left={props => <List.Icon {...props} icon="message-text" />}
                right={() => (
                  <View style={styles.swipeActionRow}>
                    <View style={styles.swipeOption}>
                      <Text variant="labelSmall" style={styles.swipeLabel}>
                        {t('labels.left')}
                      </Text>
                      <RadioButton
                        value="text-left"
                        status={leftAction === 'text' ? 'checked' : 'unchecked'}
                        onPress={() => onSelectText('left')}
                      />
                    </View>
                    <View style={styles.swipeOption}>
                      <Text variant="labelSmall" style={styles.swipeLabel}>
                        {t('labels.right')}
                      </Text>
                      <RadioButton
                        value="text-right"
                        status={rightAction === 'text' ? 'checked' : 'unchecked'}
                        onPress={() => onSelectText('right')}
                      />
                    </View>
                  </View>
                )}
              />
            </List.Accordion>
          </List.Section>
        )}

        <Divider />

        {/* Relationship Insights Section */}
        {shouldShowSection('proximity') && (
          <List.Section style={styles.section}>
            <List.Accordion
              title={t('settings.sections.proximity')}
              description={t('settings.sections.proximityDescription')}
              left={props => <List.Icon {...props} icon="target" />}
              expanded={expandedSections.proximity}
              onPress={() => toggleSection('proximity')}
            >
              <List.Item
                title={t('settings.proximity.algorithm')}
                description={t('settings.proximity.algorithmDescription')}
                left={props => <List.Icon {...props} icon="chart-bell-curve" />}
                onPress={() => navigation.navigate('ProximitySettings')}
                right={props => <List.Icon {...props} icon="chevron-right" />}
              />
            </List.Accordion>
          </List.Section>
        )}

        <Divider />

        {/* Data Management Section */}
        {shouldShowSection('data') && (
          <List.Section style={styles.section}>
            <List.Accordion
              title={t('settings.sections.data')}
              description={t('settings.sections.dataDescription')}
              left={props => <List.Icon {...props} icon="database" />}
              expanded={expandedSections.data}
              onPress={() => toggleSection('data')}
            >
              <List.Item
                title={t('settings.database.runMigrations')}
                description={t('settings.database.migrationsDescription')}
                left={props => <List.Icon {...props} icon="database-sync" />}
                right={() =>
                  runningMigrations ? (
                    <ActivityIndicator size="small" style={{ marginRight: 16 }} />
                  ) : (
                    <Button
                      mode="outlined"
                      onPress={handleRunMigrations}
                      disabled={runningMigrations || resettingDatabase}
                      compact
                    >
                      {t('settings.database.run')}
                    </Button>
                  )
                }
              />

              <List.Item
                title={t('settings.database.resetDatabase')}
                description={t('settings.database.resetDescription')}
                left={props => <List.Icon {...props} icon="database-remove" color={theme.colors.error} />}
                right={() =>
                  resettingDatabase ? (
                    <ActivityIndicator size="small" style={{ marginRight: 16 }} />
                  ) : (
                    <Button
                      mode="outlined"
                      onPress={handleResetDatabase}
                      disabled={runningMigrations || resettingDatabase}
                      compact
                      textColor={theme.colors.error}
                    >
                      {t('settings.database.reset')}
                    </Button>
                  )
                }
              />
            </List.Accordion>
          </List.Section>
        )}

        {/* Empty state for no search results */}
        {searchQuery && !Object.keys(expandedSections).some(key =>
          shouldShowSection(key)
        ) && (
          <View style={styles.emptyState}>
            <List.Icon icon="magnify" size={64} color={theme.colors.outline} />
            <Text variant="bodyLarge" style={styles.emptyStateText}>
              {t('settings.noResults')}
            </Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Success Dialog */}
      <Portal>
        <Dialog
          visible={successDialogVisible}
          onDismiss={() => setSuccessDialogVisible(false)}
        >
          <Dialog.Title>{t('labels.success')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{successDialogMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSuccessDialogVisible(false)}>
              {t('labels.ok')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchbar: {
    elevation: 1,
  },
  section: {
    marginVertical: 0,
  },
  segmentedButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  settingLabel: {
    marginBottom: 12,
  },
  radioGroupContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  radioGroupLabel: {
    marginBottom: 8,
    marginLeft: 16,
  },
  swipeActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingRight: 8,
  },
  swipeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  swipeLabel: {
    opacity: 0.6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    marginTop: 16,
    opacity: 0.6,
  },
  bottomPadding: {
    height: 24,
  },
});
