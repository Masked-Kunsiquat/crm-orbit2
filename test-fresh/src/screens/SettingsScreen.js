import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { handleError, showAlert } from '../errors';
import { Appbar, RadioButton, Text, List, Divider, Switch, Portal, Dialog, Button } from 'react-native-paper';
import { useSettings } from '../context/SettingsContext';
import authService from '../services/authService';
import database from '../database';
import { resetDatabase } from '../database/resetDb';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { logger } from '../errors';

const ACTIONS = [
  { label: 'Call', value: 'call' },
  { label: 'Text', value: 'text' },
];

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const {
    leftAction,
    rightAction,
    setMapping,
    themeMode,
    setThemeMode,
    language,
    setLanguage,
    companyManagementEnabled,
    setCompanyManagementEnabled
  } = useSettings();
  const [expandedSwipe, setExpandedSwipe] = useState(false);
  const [expandedTheme, setExpandedTheme] = useState(false);
  const [expandedSecurity, setExpandedSecurity] = useState(false);
  const [expandedLanguage, setExpandedLanguage] = useState(false);
  const [expandedFeatures, setExpandedFeatures] = useState(false);
  const [expandedDatabase, setExpandedDatabase] = useState(false);
  const [runningMigrations, setRunningMigrations] = useState(false);
  const [resettingDatabase, setResettingDatabase] = useState(false);
  const [successDialogVisible, setSuccessDialogVisible] = useState(false);
  const [successDialogMessage, setSuccessDialogMessage] = useState('');

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [autoLockEnabled, setAutoLockEnabled] = useState(false);
  const [autoLockTimeout, setAutoLockTimeout] = useState(5); // minutes

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
      logger.error('SettingsScreen', 'Failed to toggle biometric:', e);
      // Revert UI to reflect real state
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
      logger.error('SettingsScreen', 'Failed to toggle auto-lock:', e);
      // Revert UI to reflect real state
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
    // If auto-lock is enabled, persist immediately and restart timer
    if (autoLockEnabled) {
      try {
        const ok = await authService.enableAutoLock(minutes);
        if (!ok) throw new Error('enableAutoLock (update timeout) failed');
      } catch (e) {
        logger.error('SettingsScreen', 'Failed to update auto-lock timeout:', e);
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
      logger.error('SettingsScreen', 'Failed to update swipe action mapping:', error);
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
      logger.error('SettingsScreen', 'Failed to update swipe action mapping:', error);
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
      logger.error('SettingsScreen', 'Failed to update theme:', error);
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
      logger.error('SettingsScreen', 'Failed to update language:', error);
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
          // Get the current database instance and pass it to resetDatabase
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

  return (
    <View style={styles.container}>
      <Appbar.Header elevated>
        <Appbar.Content title={t('settings.title')} />
      </Appbar.Header>

      <ScrollView style={styles.scrollView}>
        {/* Security */}
        <List.Section style={styles.section}>
        <List.Accordion
          title={t('settings.sections.security')}
          expanded={expandedSecurity}
          onPress={() => setExpandedSecurity(e => !e)}
        >
          <List.Item
            title={() => <Text variant="titleSmall">{t('settings.security.pinSetup')}</Text>}
            onPress={() => navigation.navigate('PinSetup')}
          />
          <List.Item
            title={() => <Text variant="titleSmall">{t('settings.security.useBiometric')}</Text>}
            right={() => (
              <Switch value={biometricEnabled} onValueChange={toggleBiometric} />
            )}
          />
          <List.Item
            title={() => (
              <Text variant="titleSmall">{t('settings.security.autoLock', { minutes: autoLockTimeout })}</Text>
            )}
            right={() => (
              <Switch value={autoLockEnabled} onValueChange={toggleAutoLock} />
            )}
          />
          <List.Item
            title={() => <Text variant="titleSmall">{t('settings.security.autoLockTimeout')}</Text>}
            description={() => (
              <View style={styles.timeoutOptions}>
                {[1, 5, 10, 30].map((m) => (
                  <View key={m} style={styles.timeoutOption}>
                    <RadioButton
                      value={`auto-timeout-${m}`}
                      status={autoLockTimeout === m ? 'checked' : 'unchecked'}
                      onPress={() => changeAutoLockTimeout(m)}
                    />
                    <Text style={styles.timeoutLabel}>
                      {t('settings.security.minutes', { count: m })}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          />
        </List.Accordion>
      </List.Section>

      {/* Features */}
      <List.Section style={styles.section}>
        <List.Accordion
          title={t('settings.sections.features')}
          expanded={expandedFeatures}
          onPress={() => setExpandedFeatures(e => !e)}
        >
          <List.Item
            title={() => <Text variant="titleSmall">{t('settings.features.companyManagement.title')}</Text>}
            description={() => (
              <Text variant="bodySmall" style={styles.featureDescription}>
                {t('settings.features.companyManagement.description')}
              </Text>
            )}
            right={() => (
              <Switch
                value={companyManagementEnabled}
                onValueChange={async (value) => {
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

      {/* Database */}
      <List.Section style={styles.section}>
        <List.Accordion
          title={t('settings.sections.database')}
          expanded={expandedDatabase}
          onPress={() => setExpandedDatabase(e => !e)}
        >
          <List.Item
            title={() => <Text variant="titleSmall">{t('settings.database.runMigrations')}</Text>}
            description={() => (
              <Text variant="bodySmall" style={styles.featureDescription}>
                {t('settings.database.migrationsDescription')}
              </Text>
            )}
            right={() => (
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
            )}
          />
          <List.Item
            title={() => <Text variant="titleSmall">{t('settings.database.resetDatabase')}</Text>}
            description={() => (
              <Text variant="bodySmall" style={styles.featureDescription}>
                {t('settings.database.resetDescription')}
              </Text>
            )}
            right={() => (
              resettingDatabase ? (
                <ActivityIndicator size="small" style={{ marginRight: 16 }} />
              ) : (
                <Button
                  mode="outlined"
                  onPress={handleResetDatabase}
                  disabled={runningMigrations || resettingDatabase}
                  compact
                >
                  {t('settings.database.reset')}
                </Button>
              )
            )}
          />
        </List.Accordion>
      </List.Section>

      {/* Swipe Actions */}
      <List.Section style={styles.section}>
        <List.Accordion
          title={t('settings.sections.swipe')}
          expanded={expandedSwipe}
          onPress={() => setExpandedSwipe(e => !e)}
        >
          <List.Item
            title={() => (
              <Text variant="titleSmall">{t('labels.call')}</Text>
            )}
            right={() => (
              <View style={styles.rowOptions}>
                <Text style={styles.optionLabel}>{t('labels.left')}</Text>
                <RadioButton
                  value="call-left"
                  status={leftAction === 'call' ? 'checked' : 'unchecked'}
                  onPress={() => onSelectCall('left')}
                />
                <Text style={[styles.optionLabel, { marginLeft: 8 }]}>{t('labels.right')}</Text>
                <RadioButton
                  value="call-right"
                  status={rightAction === 'call' ? 'checked' : 'unchecked'}
                  onPress={() => onSelectCall('right')}
                />
              </View>
            )}
          />

          <Divider style={styles.divider} />

          <List.Item
            title={() => (
              <Text variant="titleSmall">{t('labels.text')}</Text>
            )}
            right={() => (
              <View style={styles.rowOptions}>
                <Text style={styles.optionLabel}>{t('labels.left')}</Text>
                <RadioButton
                  value="text-left"
                  status={leftAction === 'text' ? 'checked' : 'unchecked'}
                  onPress={() => onSelectText('left')}
                />
                <Text style={[styles.optionLabel, { marginLeft: 8 }]}>{t('labels.right')}</Text>
                <RadioButton
                  value="text-right"
                  status={rightAction === 'text' ? 'checked' : 'unchecked'}
                  onPress={() => onSelectText('right')}
                />
              </View>
            )}
          />
        </List.Accordion>
  </List.Section>

  {/* Theme */}
  <List.Section style={styles.section}>
        <List.Accordion
          title={t('settings.sections.theme')}
          expanded={expandedTheme}
          onPress={() => setExpandedTheme(e => !e)}
        >
          <List.Item
            title={() => <Text variant="titleSmall">{t('settings.appearance')}</Text>}
            right={() => (
              <View style={styles.rowOptions}>
                <Text style={styles.optionLabel}>{t('labels.system')}</Text>
                <RadioButton
                  value="theme-system"
                  status={themeMode === 'system' ? 'checked' : 'unchecked'}
                  onPress={() => handleThemeChange('system')}
                />
                <Text style={[styles.optionLabel, { marginLeft: 8 }]}>{t('labels.light')}</Text>
                <RadioButton
                  value="theme-light"
                  status={themeMode === 'light' ? 'checked' : 'unchecked'}
                  onPress={() => handleThemeChange('light')}
                />
                <Text style={[styles.optionLabel, { marginLeft: 8 }]}>{t('labels.dark')}</Text>
                <RadioButton
                  value="theme-dark"
                  status={themeMode === 'dark' ? 'checked' : 'unchecked'}
                  onPress={() => handleThemeChange('dark')}
                />
              </View>
            )}
          />
        </List.Accordion>
  </List.Section>

  {/* Language */}
  <List.Section style={styles.section}>
    <List.Accordion
      title={t('settings.sections.language')}
      expanded={expandedLanguage}
      onPress={() => setExpandedLanguage(e => !e)}
    >
      <List.Item
        title={() => <Text variant="titleSmall">{t('settings.language.device')}</Text>}
        right={() => (
          <RadioButton
            value="lang-device"
            status={language === 'device' ? 'checked' : 'unchecked'}
            onPress={() => handleLanguageChange('device')}
          />
        )}
        onPress={() => handleLanguageChange('device')}
      />
      <List.Item
        title={() => <Text variant="titleSmall">{t('settings.language.english')}</Text>}
        right={() => (
          <RadioButton
            value="lang-en"
            status={language === 'en' ? 'checked' : 'unchecked'}
            onPress={() => handleLanguageChange('en')}
          />
        )}
        onPress={() => handleLanguageChange('en')}
      />
      <List.Item
        title={() => <Text variant="titleSmall">{t('settings.language.spanish')}</Text>}
        right={() => (
          <RadioButton
            value="lang-es"
            status={language === 'es' ? 'checked' : 'unchecked'}
            onPress={() => handleLanguageChange('es')}
          />
        )}
        onPress={() => handleLanguageChange('es')}
      />
      <List.Item
        title={() => <Text variant="titleSmall">{t('settings.language.german')}</Text>}
        right={() => (
          <RadioButton
            value="lang-de"
            status={language === 'de' ? 'checked' : 'unchecked'}
            onPress={() => handleLanguageChange('de')}
          />
        )}
        onPress={() => handleLanguageChange('de')}
      />
      <List.Item
        title={() => <Text variant="titleSmall">{t('settings.language.french')}</Text>}
        right={() => (
          <RadioButton
            value="lang-fr"
            status={language === 'fr' ? 'checked' : 'unchecked'}
            onPress={() => handleLanguageChange('fr')}
          />
        )}
        onPress={() => handleLanguageChange('fr')}
      />
      <List.Item
        title={() => <Text variant="titleSmall">{t('settings.language.chinese')}</Text>}
        right={() => (
          <RadioButton
            value="lang-zh"
            status={language === 'zh' ? 'checked' : 'unchecked'}
            onPress={() => handleLanguageChange('zh')}
          />
        )}
        onPress={() => handleLanguageChange('zh')}
      />
    </List.Accordion>
  </List.Section>
      </ScrollView>

      {/* Themed Success Dialog */}
      <Portal>
        <Dialog visible={successDialogVisible} onDismiss={() => setSuccessDialogVisible(false)}>
          <Dialog.Title>{t('labels.success')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{successDialogMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSuccessDialogVisible(false)}>OK</Button>
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
  section: {
    paddingHorizontal: 8,
  },
  divider: {
    marginVertical: 8,
  },
  rowOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  optionLabel: {
    color: '#666',
    marginRight: 4,
  },
  timeoutOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  timeoutOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  timeoutLabel: {
    color: '#666',
    fontSize: 14,
    marginLeft: -8,
  },
  featureDescription: {
    color: '#666',
    marginTop: 4,
  },
});
