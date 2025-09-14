// App initialization component that handles database setup and loading states
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Surface, Text, ActivityIndicator, Button } from 'react-native-paper';
import databaseService from '../services/databaseService';

const AppInitializer = ({ children, initTimeoutMs = 15000 }) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initializationError, setInitializationError] = useState(null);
  const mountedRef = useRef(true);

  const initializeApp = useCallback(async () => {
    try {
      if (!mountedRef.current) return;
      setIsInitializing(true);
      setInitializationError(null);

      // Initialize database
      console.log('Starting app initialization...');
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      let timeoutId;

      const initPromise = databaseService.initialize({ signal: controller?.signal });

      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          if (controller && typeof controller.abort === 'function') {
            controller.abort();
          }
          reject(new Error(`Initialization timed out after ${initTimeoutMs}ms`));
        }, initTimeoutMs);
      });

      await Promise.race([initPromise, timeoutPromise]);

      if (timeoutId) clearTimeout(timeoutId);
      console.log('App initialization complete');

      if (!mountedRef.current) return;
      setIsInitializing(false);
    } catch (error) {
      console.error('App initialization failed:', error);
      if (!mountedRef.current) return;
      setInitializationError(error.message);
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    initializeApp();
    return () => { mountedRef.current = false; };
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
