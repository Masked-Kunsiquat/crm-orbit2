import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { settingsDB } from '../database';
import i18n from '../i18n';
import { getLocales } from 'expo-localization';

const SettingsContext = createContext({
  leftAction: 'text',
  rightAction: 'call',
  themeMode: 'system', // 'system' | 'light' | 'dark'
  language: 'device', // 'device' | 'en' | 'es' | others
  setMapping: (_left, _right) => {},
  setThemeMode: (_mode) => {},
  setLanguage: (_lang) => {},
});

export function SettingsProvider({ children }) {
  const [leftAction, setLeftAction] = useState('text');
  const [rightAction, setRightAction] = useState('call');
  const [themeMode, setThemeModeState] = useState('system');
  const [language, setLanguageState] = useState('device');

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
        setThemeModeState(['light','dark','system'].includes(themeVal) ? themeVal : 'system');
        // language
        const lang = await settingsDB.get('i18n.language');
        const langVal = lang?.value || 'device';
        const supported = ['device','en','es'];
        const normalized = supported.includes(langVal) ? langVal : 'device';
        setLanguageState(normalized);
        // Apply language immediately
        if (normalized === 'device') {
          const locales = getLocales?.();
          const tag = (locales && locales[0] && (locales[0].languageTag || locales[0].locale)) || 'en-US';
          i18n.changeLanguage(tag.split('-')[0]).catch(() => {});
        } else {
          i18n.changeLanguage(normalized).catch(() => {});
        }
      } catch (_) {
        setLeftAction('text');
        setRightAction('call');
        setThemeModeState('system');
        setLanguageState('device');
      }
    })();
  }, []);

  const setMapping = useCallback(async (left, right) => {
    const prevLeft = leftAction;
    const prevRight = rightAction;
    // Optimistic update
    setLeftAction(left);
    setRightAction(right);
    try {
      await settingsDB.set('interactions.swipe_left_action', left, 'string');
      await settingsDB.set('interactions.swipe_right_action', right, 'string');
    } catch (error) {
      // Rollback on failure
      console.error('Failed to persist swipe action settings:', error);
      setLeftAction(prevLeft);
      setRightAction(prevRight);
      throw error;
    }
  }, [leftAction, rightAction]);

  const setThemeMode = useCallback(async (mode) => {
    const normalized = ['light','dark','system'].includes(mode) ? mode : 'system';
    const prevTheme = themeMode;
    // Optimistic update
    setThemeModeState(normalized);
    try {
      await settingsDB.set('display.theme', normalized, 'string');
    } catch (error) {
      // Rollback on failure
      console.error('Failed to persist theme setting:', error);
      setThemeModeState(prevTheme);
      throw error;
    }
  }, [themeMode]);

  const setLanguage = useCallback(async (lang) => {
    const supported = ['device','en','es'];
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
        const tag = (locales && locales[0] && (locales[0].languageTag || locales[0].locale)) || 'en-US';
        await i18n.changeLanguage(tag.split('-')[0]);
      } else {
        await i18n.changeLanguage(normalized);
      }
    } catch (error) {
      // Rollback on failure
      console.error('Failed to persist language setting:', error);
      setLanguageState(prevLang);
      // Try to restore previous i18n language
      try {
        if (prevLang === 'device') {
          const locales = getLocales?.();
          const tag = (locales && locales[0] && (locales[0].languageTag || locales[0].locale)) || 'en-US';
          await i18n.changeLanguage(tag.split('-')[0]);
        } else {
          await i18n.changeLanguage(prevLang);
        }
      } catch (i18nError) {
        console.error('Failed to rollback i18n language:', i18nError);
      }
      throw error;
    }
  }, [language]);

  const value = useMemo(
    () => ({ leftAction, rightAction, themeMode, language, setMapping, setThemeMode, setLanguage }),
    [leftAction, rightAction, themeMode, language, setMapping, setThemeMode, setLanguage]
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
