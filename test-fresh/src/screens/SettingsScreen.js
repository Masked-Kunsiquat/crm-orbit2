import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Appbar, RadioButton, Text, List, Divider, Switch } from 'react-native-paper';
import { useSettings } from '../context/SettingsContext';
import authService from '../services/authService';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

const ACTIONS = [
  { label: 'Call', value: 'call' },
  { label: 'Text', value: 'text' },
];

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { leftAction, rightAction, setMapping, themeMode, setThemeMode, language, setLanguage } = useSettings();
  const [expandedSwipe, setExpandedSwipe] = useState(false);
  const [expandedTheme, setExpandedTheme] = useState(false);
  const [expandedSecurity, setExpandedSecurity] = useState(false);
  const [expandedLanguage, setExpandedLanguage] = useState(false);

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [autoLockEnabled, setAutoLockEnabled] = useState(false);

  React.useEffect(() => {
    (async () => {
      setBiometricEnabled(await authService.isBiometricEnabled());
      setAutoLockEnabled(await authService.isAutoLockEnabled());
    })();
  }, []);

  const toggleBiometric = async () => {
    try {
      if (biometricEnabled) {
        await authService.disableBiometric();
        setBiometricEnabled(false);
      } else {
        await authService.enableBiometric();
        setBiometricEnabled(true);
      }
    } catch (e) {
      // no-op simple handling
    }
  };

  const toggleAutoLock = async () => {
    try {
      if (autoLockEnabled) {
        await authService.disableAutoLock();
        setAutoLockEnabled(false);
      } else {
        await authService.enableAutoLock(5);
        setAutoLockEnabled(true);
      }
    } catch (e) {
      // no-op
    }
  };

  const onSelectCall = side => {
    if (side === 'left') setMapping('call', 'text');
    else setMapping('text', 'call');
  };

  const onSelectText = side => {
    if (side === 'left') setMapping('text', 'call');
    else setMapping('call', 'text');
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title={t('settings.title')} />
      </Appbar.Header>

      {/* Security */}
      <List.Section style={styles.section}>
        <List.Accordion
          title={t('settings.sections.security')}
          expanded={expandedSecurity}
          onPress={() => setExpandedSecurity(e => !e)}
        >
          <List.Item
            title={() => <Text variant="titleSmall">Set / Change PIN</Text>}
            onPress={() => navigation.navigate('PinSetup')}
          />
          <List.Item
            title={() => <Text variant="titleSmall">Use Biometric</Text>}
            right={() => (
              <Switch value={biometricEnabled} onValueChange={toggleBiometric} />
            )}
          />
          <List.Item
            title={() => <Text variant="titleSmall">Auto-Lock (5 min)</Text>}
            right={() => (
              <Switch value={autoLockEnabled} onValueChange={toggleAutoLock} />
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
                  onPress={() => setThemeMode('system')}
                />
                <Text style={[styles.optionLabel, { marginLeft: 8 }]}>{t('labels.light')}</Text>
                <RadioButton
                  value="theme-light"
                  status={themeMode === 'light' ? 'checked' : 'unchecked'}
                  onPress={() => setThemeMode('light')}
                />
                <Text style={[styles.optionLabel, { marginLeft: 8 }]}>{t('labels.dark')}</Text>
                <RadioButton
                  value="theme-dark"
                  status={themeMode === 'dark' ? 'checked' : 'unchecked'}
                  onPress={() => setThemeMode('dark')}
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
            onPress={() => setLanguage('device')}
          />
        )}
        onPress={() => setLanguage('device')}
      />
      <List.Item
        title={() => <Text variant="titleSmall">{t('settings.language.english')}</Text>}
        right={() => (
          <RadioButton
            value="lang-en"
            status={language === 'en' ? 'checked' : 'unchecked'}
            onPress={() => setLanguage('en')}
          />
        )}
        onPress={() => setLanguage('en')}
      />
      <List.Item
        title={() => <Text variant="titleSmall">{t('settings.language.spanish')}</Text>}
        right={() => (
          <RadioButton
            value="lang-es"
            status={language === 'es' ? 'checked' : 'unchecked'}
            onPress={() => setLanguage('es')}
          />
        )}
        onPress={() => setLanguage('es')}
      />
    </List.Accordion>
  </List.Section>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
});
