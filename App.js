import 'react-native-gesture-handler'; // Must be first import for navigation
import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider, Text, Button } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ErrorBoundary } from 'react-error-boundary';

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
function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text variant="titleMedium">Something went wrong</Text>
      <Text variant="bodyMedium" style={{ marginTop: 8, textAlign: 'center' }}>{error?.message}</Text>
      <Button style={{ marginTop: 16 }} mode="contained" onPress={resetErrorBoundary}>Try again</Button>
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
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
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
