import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { settingsDB } from '../database';
import i18n from '../i18n';
import { getLocales } from 'expo-localization';
import { logger } from '../errors';

const SettingsContext = createContext({
  leftAction: 'text',
  rightAction: 'call',
  themeMode: 'system', // 'system' | 'light' | 'dark'
  language: 'device', // 'device' | 'en' | 'es' | others
  companyManagementEnabled: false, // Toggle for company features
  setMapping: (_left, _right) => {},
  setThemeMode: _mode => {},
  setLanguage: _lang => {},
  setCompanyManagementEnabled: _enabled => {},
});

export function SettingsProvider({ children }) {
  const [leftAction, setLeftAction] = useState('text');
  const [rightAction, setRightAction] = useState('call');
  const [themeMode, setThemeModeState] = useState('system');
  const [language, setLanguageState] = useState('device');
  const [companyManagementEnabled, setCompanyManagementEnabledState] =
    useState(false);

  // Load once on mount
  useEffect(() => {
    (async () => {
      try {
        const values = await settingsDB.getValues('interactions', [
          'swipe_left_action',
          'swipe_right_action',
        ]);
        setLeftAction(values.swipe_left_action || 'text');
        setRightAction(values.swipe_right_action || 'call');
        // theme
        const theme = await settingsDB.get('display.theme');
        const themeVal = theme?.value || 'system';
        setThemeModeState(
          ['light', 'dark', 'system'].includes(themeVal) ? themeVal : 'system'
        );
        // language
        const lang = await settingsDB.get('i18n.language');
        const langVal = lang?.value || 'device';
        const supported = ['device', 'en', 'es', 'de', 'fr', 'zh'];
        const normalized = supported.includes(langVal) ? langVal : 'device';
        setLanguageState(normalized);
        // Apply language immediately
        if (normalized === 'device') {
          const locales = getLocales?.();
          const tag =
            (locales &&
              locales[0] &&
              (locales[0].languageTag || locales[0].locale)) ||
            'en-US';
          i18n.changeLanguage(tag.split('-')[0]).catch(() => {});
        } else {
          i18n.changeLanguage(normalized).catch(() => {});
        }
        // company management
        const companyMgmt = await settingsDB.get(
          'features.company_management_enabled'
        );
        const companyMgmtVal = companyMgmt?.value;
        setCompanyManagementEnabledState(
          companyMgmtVal === true || companyMgmtVal === 'true'
        );
      } catch (error) {
        logger.warn('SettingsContext', 'initialization', {
          error: error.message,
          stack: error.stack,
        });
        setLeftAction('text');
        setRightAction('call');
        setThemeModeState('system');
        setLanguageState('device');
        setCompanyManagementEnabledState(false);
      }
    })();
  }, []);

  const setMapping = useCallback(
    async (left, right) => {
      const prevLeft = leftAction;
      const prevRight = rightAction;
      // Optimistic update
      setLeftAction(left);
      setRightAction(right);
      try {
        await settingsDB.set('interactions.swipe_left_action', left, 'string');
        await settingsDB.set(
          'interactions.swipe_right_action',
          right,
          'string'
        );
      } catch (error) {
        // Rollback on failure
        logger.error('SettingsContext', 'setMapping', error);
        setLeftAction(prevLeft);
        setRightAction(prevRight);
        throw error;
      }
    },
    [leftAction, rightAction]
  );

  const setThemeMode = useCallback(
    async mode => {
      const normalized = ['light', 'dark', 'system'].includes(mode)
        ? mode
        : 'system';
      const prevTheme = themeMode;
      // Optimistic update
      setThemeModeState(normalized);
      try {
        await settingsDB.set('display.theme', normalized, 'string');
      } catch (error) {
        // Rollback on failure
        logger.error('SettingsContext', 'setThemeMode', error);
        setThemeModeState(prevTheme);
        throw error;
      }
    },
    [themeMode]
  );

  const setLanguage = useCallback(
    async lang => {
      const supported = ['device', 'en', 'es', 'de', 'fr', 'zh'];
      const normalized = supported.includes(lang) ? lang : 'device';
      const prevLang = language;
      // Optimistic update
      setLanguageState(normalized);

      try {
        // Persist to database
        await settingsDB.set('i18n.language', normalized, 'string');

        // Apply language change to i18n
        if (normalized === 'device') {
          const locales = getLocales?.();
          const tag =
            (locales &&
              locales[0] &&
              (locales[0].languageTag || locales[0].locale)) ||
            'en-US';
          await i18n.changeLanguage(tag.split('-')[0]);
        } else {
          await i18n.changeLanguage(normalized);
        }
      } catch (error) {
        // Rollback on failure
        logger.error('SettingsContext', 'setLanguage', error);
        setLanguageState(prevLang);
        // Try to restore previous i18n language
        try {
          if (prevLang === 'device') {
            const locales = getLocales?.();
            const tag =
              (locales &&
                locales[0] &&
                (locales[0].languageTag || locales[0].locale)) ||
              'en-US';
            await i18n.changeLanguage(tag.split('-')[0]);
          } else {
            await i18n.changeLanguage(prevLang);
          }
        } catch (i18nError) {
          logger.error('SettingsContext', 'setLanguage - rollback', i18nError);
        }
        throw error;
      }
    },
    [language]
  );

  const setCompanyManagementEnabled = useCallback(
    async enabled => {
      const normalized = Boolean(enabled);
      const prevEnabled = companyManagementEnabled;
      // Optimistic update
      setCompanyManagementEnabledState(normalized);
      try {
        await settingsDB.set(
          'features.company_management_enabled',
          normalized,
          'boolean'
        );
      } catch (error) {
        // Rollback on failure
        logger.error('SettingsContext', 'setCompanyManagementEnabled', error);
        setCompanyManagementEnabledState(prevEnabled);
        throw error;
      }
    },
    [companyManagementEnabled]
  );

  const value = useMemo(
    () => ({
      leftAction,
      rightAction,
      themeMode,
      language,
      companyManagementEnabled,
      setMapping,
      setThemeMode,
      setLanguage,
      setCompanyManagementEnabled,
    }),
    [
      leftAction,
      rightAction,
      themeMode,
      language,
      companyManagementEnabled,
      setMapping,
      setThemeMode,
      setLanguage,
      setCompanyManagementEnabled,
    ]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
