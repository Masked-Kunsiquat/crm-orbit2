import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { initDatabase } from './src/database';

export default function App() {
  const [dbStatus, setDbStatus] = useState('Initializing...');

  useEffect(() => {
    const initDB = async () => {
      try {
        await initDatabase({
          enableForeignKeys: false,
          enableWAL: false,
          runMigrationsOnInit: false,
          onLog: (msg) => console.log('DB:', msg)
        });
        setDbStatus('Database initialized successfully!');
      } catch (error) {
        setDbStatus(`Database error: ${error.message}`);
        console.error('Database initialization failed:', error);
      }
    };

    initDB();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CRM Database Test</Text>
      <Text style={styles.status}>{dbStatus}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  status: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  },
});
