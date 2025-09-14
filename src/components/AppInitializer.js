// App initialization component that handles database setup and loading states
import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Layout, Text, Spinner } from '@ui-kitten/components';
import databaseService from '../services/databaseService';

const AppInitializer = ({ children }) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initializationError, setInitializationError] = useState(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setIsInitializing(true);
      setInitializationError(null);

      // Initialize database
      console.log('Starting app initialization...');
      await databaseService.initialize();
      console.log('App initialization complete');

      setIsInitializing(false);
    } catch (error) {
      console.error('App initialization failed:', error);
      setInitializationError(error.message);
      setIsInitializing(false);
    }
  };

  const handleRetry = () => {
    initializeApp();
  };

  // Loading screen
  if (isInitializing) {
    return (
      <Layout style={styles.container}>
        <View style={styles.content}>
          <Spinner size="large" />
          <Text category="h6" style={styles.loadingText}>
            Initializing CRM...
          </Text>
          <Text category="p2" style={styles.subText}>
            Setting up database and services
          </Text>
        </View>
      </Layout>
    );
  }

  // Error screen
  if (initializationError) {
    return (
      <Layout style={styles.container}>
        <View style={styles.content}>
          <Text category="h5" status="danger" style={styles.errorTitle}>
            Initialization Failed
          </Text>
          <Text category="p1" style={styles.errorMessage}>
            {initializationError}
          </Text>
          <Text 
            category="p2" 
            style={styles.retryText}
            onPress={handleRetry}
          >
            Tap to retry
          </Text>
        </View>
      </Layout>
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
  retryText: {
    textDecorationLine: 'underline',
    color: '#007AFF',
  },
});

export default AppInitializer;