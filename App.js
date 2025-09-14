import React from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-gesture-handler'; // Must be at top for navigation
import * as eva from '@eva-design/eva';
import { ApplicationProvider } from '@ui-kitten/components';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// App components
import AppInitializer from './src/components/AppInitializer';
import AuthGate from './src/components/AuthGate';
import MainNavigator from './src/navigation/MainNavigator';

/**
 * Main App Component
 * 
 * Initialization Flow:
 * 1. UI Kitten Theme Provider
 * 2. Safe Area Provider for proper screen handling
 * 3. AppInitializer - Database setup with loading screen
 * 4. AuthGate - Authentication wrapper
 * 5. MainNavigator - App navigation (only when authenticated)
 */
export default function App() {
  return (
    <ApplicationProvider {...eva} theme={eva.light}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <AppInitializer>
          <AuthGate>
            <MainNavigator />
          </AuthGate>
        </AppInitializer>
      </SafeAreaProvider>
    </ApplicationProvider>
  );
}
