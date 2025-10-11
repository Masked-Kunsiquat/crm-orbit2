import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
    setLeftAction(left);
    setRightAction(right);
    try {
      await settingsDB.set('interactions.swipe_left_action', left, 'string');
      await settingsDB.set('interactions.swipe_right_action', right, 'string');
    } catch (_) {}
  }, []);

  const setThemeMode = useCallback(async (mode) => {
    const normalized = ['light','dark','system'].includes(mode) ? mode : 'system';
    setThemeModeState(normalized);
    try {
      await settingsDB.set('display.theme', normalized, 'string');
    } catch (_) {}
  }, []);

  const setLanguage = useCallback(async (lang) => {
    const supported = ['device','en','es'];
    const normalized = supported.includes(lang) ? lang : 'device';
    setLanguageState(normalized);
    try {
      await settingsDB.set('i18n.language', normalized, 'string');
    } catch (_) {}
    try {
      if (normalized === 'device') {
        const locales = getLocales?.();
        const tag = (locales && locales[0] && (locales[0].languageTag || locales[0].locale)) || 'en-US';
        await i18n.changeLanguage(tag.split('-')[0]);
      } else {
        await i18n.changeLanguage(normalized);
      }
    } catch (_) {}
  }, []);

  return (
    <SettingsContext.Provider value={{ leftAction, rightAction, themeMode, language, setMapping, setThemeMode, setLanguage }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
