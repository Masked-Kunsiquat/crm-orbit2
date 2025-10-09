import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { PaperProvider, MD3LightTheme, Text, Card } from 'react-native-paper';
import { initDatabase } from './src/database';
import { createBasicTables } from './src/database/simpleSetup';
import ContactsList from './src/screens/ContactsList';

export default function App() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [dbError, setDbError] = useState(null);

  useEffect(() => {
    const initializeDB = async () => {
      try {
        console.log('Initializing database with modern expo-sqlite API...');

        // Initialize database connection
        await initDatabase({
          runMigrationsOnInit: false, // Skip complex migrations, use simple setup
          onLog: console.log,
        });
        console.log('Database connection initialized');

        // Create basic tables
        await createBasicTables();
        console.log('Basic tables created successfully');

        setIsDbReady(true);
      } catch (error) {
        console.error('Database initialization failed:', error);
        setDbError('Database init failed: ' + error.message);
      }
    };

    initializeDB();
  }, []);

  if (dbError) {
    return (
      <PaperProvider theme={MD3LightTheme}>
        <View style={styles.errorContainer}>
          <Card style={styles.errorCard}>
            <Card.Content>
              <Text variant="headlineMedium" style={styles.errorTitle}>
                Database Error
              </Text>
              <Text variant="bodyMedium" style={styles.errorMessage}>
                {dbError}
              </Text>
            </Card.Content>
          </Card>
        </View>
        <StatusBar style="auto" />
      </PaperProvider>
    );
  }

  if (!isDbReady) {
    return (
      <PaperProvider theme={MD3LightTheme}>
        <View style={styles.loadingContainer}>
          <Text variant="headlineMedium">Initializing Database...</Text>
        </View>
        <StatusBar style="auto" />
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={MD3LightTheme}>
      <ContactsList />
      <StatusBar style="auto" />
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  errorCard: {
    padding: 16,
  },
  errorTitle: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#d32f2f',
  },
  errorMessage: {
    textAlign: 'center',
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
