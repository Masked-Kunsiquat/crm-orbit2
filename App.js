import 'react-native-gesture-handler'; // Must be first import for navigation
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// App components
import AppInitializer from './src/components/AppInitializer';
import AuthGate from './src/components/AuthGate';
import MainNavigator from './src/navigation/MainNavigator';

/**
 * Main App Component
 * 
 * Initialization Flow:
 * 1. React Native Paper Theme Provider
 * 2. Safe Area Provider for proper screen handling
 * 3. AppInitializer - Database setup with loading screen
 * 4. AuthGate - Authentication wrapper
 * 5. MainNavigator - App navigation (only when authenticated)
 */
export default function App() {
  return (
    <PaperProvider>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <AppInitializer>
          <AuthGate>
            <MainNavigator />
          </AuthGate>
        </AppInitializer>
      </SafeAreaProvider>
    </PaperProvider>
  );
}
