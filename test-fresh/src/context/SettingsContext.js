import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { settingsDB } from '../database';

const SettingsContext = createContext({
  leftAction: 'text',
  rightAction: 'call',
  setMapping: (_left, _right) => {},
});

export function SettingsProvider({ children }) {
  const [leftAction, setLeftAction] = useState('text');
  const [rightAction, setRightAction] = useState('call');

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
      } catch (_) {
        setLeftAction('text');
        setRightAction('call');
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

  return (
    <SettingsContext.Provider value={{ leftAction, rightAction, setMapping }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

