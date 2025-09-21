import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import {
  MD3LightTheme,
  MD3DarkTheme,
  Provider as PaperProvider,
} from 'react-native-paper';
import * as SystemUI from 'expo-system-ui';
import {
  DefaultTheme as NavLightTheme,
  DarkTheme as NavDarkTheme,
} from '@react-navigation/native';

const STORAGE_KEY = 'display.theme'; // 'system' | 'light' | 'dark'

const ThemeContext = createContext(null);

function normalizeMode(raw) {
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  return 'system';
}

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [mode, setModeState] = useState('system');
  const resolvedScheme = mode === 'system' ? (systemScheme ?? 'light') : mode;
  const isDark = resolvedScheme === 'dark';

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setModeState(normalizeMode(stored));
      } catch (_) {
        // ignore, default to system
      }
    })();
  }, []);

  const setMode = useCallback(async nextMode => {
    const norm = normalizeMode(nextMode);
    setModeState(norm);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, norm);
    } catch (_) {}
  }, []);

  const paperTheme = useMemo(() => {
    const base = isDark ? MD3DarkTheme : MD3LightTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        // Keep defaults; customize here if desired
      },
    };
  }, [isDark]);

  const navigationTheme = useMemo(() => {
    const base = isDark ? NavDarkTheme : NavLightTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: paperTheme.colors.primary,
        background: paperTheme.colors.background,
        card: paperTheme.colors.elevation?.level2 || base.colors.card,
        text: paperTheme.colors.onSurface,
        border: paperTheme.colors.outlineVariant || base.colors.border,
      },
    };
  }, [isDark, paperTheme]);

  // Sync Android system UI background color for proper edge-to-edge appearance
  useEffect(() => {
    const bg = paperTheme.colors?.background;
    if (bg && typeof SystemUI.setBackgroundColorAsync === 'function') {
      try {
        SystemUI.setBackgroundColorAsync(bg);
      } catch (_) {}
    }
  }, [paperTheme]);

  const value = useMemo(
    () => ({ mode, setMode, isDark, paperTheme, navigationTheme }),
    [mode, setMode, isDark, paperTheme, navigationTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      <PaperProvider theme={paperTheme}>{children}</PaperProvider>
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used within ThemeProvider');
  return ctx;
}
