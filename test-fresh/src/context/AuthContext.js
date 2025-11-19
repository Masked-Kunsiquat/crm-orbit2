import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import authService from '../services/authService';

const AuthContext = createContext({
  isLocked: true,
  initializing: true,
  authenticate: async (_options) => ({ success: false }),
  authenticateWithPIN: async (_pin) => ({ success: false }),
  lock: async () => false,
  unlock: async () => false,
  refresh: async () => {},
});

export function AuthProvider({ children }) {
  const [isLocked, setIsLocked] = useState(true);
  const [initializing, setInitializing] = useState(true);

  // Subscribe to service events
  useEffect(() => {
    const remove = authService.addListener(async (evt) => {
      if (evt?.type === 'lock' || evt?.type === 'unlock') {
        const state = await authService.getLockState();
        setIsLocked(state);
      }
    });
    return remove;
  }, []);

  // Initialize on mount
  useEffect(() => {
    (async () => {
      try {
        await authService.initialize();

        // If no auth configured at all, ensure app starts unlocked
        const [hasPin, bioEnabled] = await Promise.all([
          authService.hasPIN(),
          authService.isBiometricEnabled(),
        ]);
        if (!hasPin && !bioEnabled) {
          await authService.unlock('no-auth-configured');
        }

        const state = await authService.getLockState();
        setIsLocked(state);
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  // Handle app state transitions for auto-lock
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      authService.onAppStateChange?.(next);
    });
    return () => sub?.remove?.();
  }, []);

  const lock = useCallback(async () => {
    const ok = await authService.lock();
    setIsLocked(await authService.getLockState());
    return ok;
  }, []);

  const unlock = useCallback(async () => {
    const ok = await authService.unlock();
    setIsLocked(await authService.getLockState());
    return ok;
  }, []);

  const authenticate = useCallback(async (options = {}) => {
    const r = await authService.authenticate(options);
    if (r?.success) {
      setIsLocked(false);
    }
    return r;
  }, []);

  const authenticateWithPIN = useCallback(async (pin) => {
    const r = await authService.authenticateWithPIN(pin);
    if (r?.success) {
      await authService.onSuccessfulAuth();
      setIsLocked(false);
    }
    return r;
  }, []);

  const refresh = useCallback(async () => {
    setIsLocked(await authService.getLockState());
  }, []);

  // Intentionally only depend on state values (isLocked, initializing) to prevent infinite re-renders.
  // The callbacks (authenticate, lock, unlock, refresh) are stable with empty deps and don't need to trigger re-memoization.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(
    () => ({ isLocked, initializing, authenticate, authenticateWithPIN, lock, unlock, refresh }),
    [isLocked, initializing]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

