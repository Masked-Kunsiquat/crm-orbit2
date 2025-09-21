// App initialization component that handles database setup and loading states
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Surface, Text, ActivityIndicator, Button } from 'react-native-paper';
import databaseService from '../services/databaseService';
import authService from '../services/authService';

const AppInitializer = ({ children, initTimeoutMs = 15000 }) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initializationError, setInitializationError] = useState(null);
  const mountedRef = useRef(true);
  const controllerRef = useRef(null);

  const initializeApp = useCallback(async () => {
    try {
      if (!mountedRef.current) return;
      // Abort any in-flight init before starting a new one
      if (
        controllerRef.current &&
        typeof controllerRef.current.abort === 'function'
      ) {
        try {
          controllerRef.current.abort();
        } catch (e) {
          /* noop */
        }
      }
      // Fresh controller for this run
      try {
        controllerRef.current =
          typeof AbortController !== 'undefined' ? new AbortController() : null;
      } catch (e) {
        console.warn('AbortController not available:', e);
        controllerRef.current = null;
      }
      const signal = controllerRef.current?.signal;

      setIsInitializing(true);
      setInitializationError(null);

      // Initialize database with additional safety checks
      console.log('Starting app initialization...');
      let timeoutId;
      try {
        // Wrap database initialization with additional error handling
        const initPromise = Promise.resolve().then(() =>
          databaseService.initialize({ signal })
        );
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            if (
              controllerRef.current &&
              typeof controllerRef.current.abort === 'function'
            ) {
              try {
                controllerRef.current.abort();
              } catch (e) {
                /* noop */
              }
            }
            reject(
              new Error(
                `Database initialization timed out after ${initTimeoutMs}ms`
              )
            );
          }, initTimeoutMs);
        });

        await Promise.race([initPromise, timeoutPromise]);
        console.log('Database initialization completed successfully');
      } catch (initError) {
        console.error('Database initialization failed:', initError);
        throw initError;
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }

      // After DB init, bootstrap other core services
      try {
        // Initialize authentication service (auto-lock timers, lock state)
        await authService.initialize();

        // Future hooks: permissions, notifications, reminders, backups
        // e.g., notificationService.requestPermissions();
        //       notificationService.reschedulePendingReminders();
        //       backupService.checkAutoBackup();
      } catch (bootError) {
        console.warn(
          'Post-initialization service bootstrap encountered an issue:',
          bootError
        );
        // Continue; non-critical services failing should not block app load
      }

      console.log('App initialization complete');

      // Avoid state updates if aborted/unmounted
      if (
        !mountedRef.current ||
        (controllerRef.current && controllerRef.current.signal?.aborted)
      )
        return;
      setIsInitializing(false);
    } catch (error) {
      console.error('App initialization failed:', error);
      // Ignore AbortError from explicit aborts (unmount or retry)
      if (error?.name === 'AbortError' || !mountedRef.current) {
        return;
      }
      setInitializationError(error.message || 'Initialization failed');
      setIsInitializing(false);
    }
  }, [initTimeoutMs]);

  useEffect(() => {
    initializeApp();
    return () => {
      // Mark unmounted and abort any in-flight work
      if (
        controllerRef.current &&
        typeof controllerRef.current.abort === 'function'
      ) {
        try {
          controllerRef.current.abort();
        } catch (e) {
          /* noop */
        }
      }
      mountedRef.current = false;
    };
  }, [initializeApp]);

  const handleRetry = () => {
    initializeApp();
  };

  // Loading screen
  if (isInitializing) {
    return (
      <Surface style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" />
          <Text variant="titleLarge" style={styles.loadingText}>
            Initializing CRM...
          </Text>
          <Text variant="bodyMedium" style={styles.subText}>
            Setting up database and services
          </Text>
        </View>
      </Surface>
    );
  }

  // Error screen
  if (initializationError) {
    return (
      <Surface style={styles.container}>
        <View style={styles.content}>
          <Text variant="headlineSmall" style={styles.errorTitle}>
            Initialization Failed
          </Text>
          <Text variant="bodyLarge" style={styles.errorMessage}>
            {initializationError}
          </Text>
          <Button mode="text" onPress={handleRetry}>
            Tap to retry
          </Button>
        </View>
      </Surface>
    );
  }

  // App initialized successfully - render children
  return children;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
  },
  subText: {
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.7,
  },
  errorTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    marginBottom: 24,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});

export default AppInitializer;
