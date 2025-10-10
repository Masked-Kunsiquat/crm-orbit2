import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { settingsDB } from '../database';

const SettingsContext = createContext({
  leftAction: 'text',
  rightAction: 'call',
  themeMode: 'system', // 'system' | 'light' | 'dark'
  setMapping: (_left, _right) => {},
  setThemeMode: (_mode) => {},
});

export function SettingsProvider({ children }) {
  const [leftAction, setLeftAction] = useState('text');
  const [rightAction, setRightAction] = useState('call');
  const [themeMode, setThemeModeState] = useState('system');

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
      } catch (_) {
        setLeftAction('text');
        setRightAction('call');
        setThemeModeState('system');
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

  return (
    <SettingsContext.Provider value={{ leftAction, rightAction, themeMode, setMapping, setThemeMode }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
