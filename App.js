import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import * as eva from '@eva-design/eva';
import { ApplicationProvider, Layout } from '@ui-kitten/components';
import AuthGate from './src/components/AuthGate';

// Main app content (placeholder - will be replaced with actual screens)
const AppContent = () => {
  return (
    <Layout style={styles.container}>
      <Text style={styles.text}>Welcome to CRM App!</Text>
      <Text style={styles.subText}>Authentication system is active</Text>
      <StatusBar style="auto" />
    </Layout>
  );
};

export default function App() {
  return (
    <ApplicationProvider {...eva} theme={eva.light}>
      <AuthGate>
        <AppContent />
      </AuthGate>
    </ApplicationProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7f9fc',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222B45',
    marginBottom: 8,
    textAlign: 'center',
  },
  subText: {
    fontSize: 16,
    color: '#8F9BB3',
    textAlign: 'center',
  },
});
