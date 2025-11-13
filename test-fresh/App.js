import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { PaperProvider, MD3LightTheme, MD3DarkTheme, Text, Card, BottomNavigation, Icon } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { initDatabase } from './src/database';
import { createBasicTables } from './src/database/simpleSetup';
import DashboardScreen from './src/screens/DashboardScreen';
import ContactsList from './src/screens/ContactsList';
import ContactDetailScreen from './src/screens/ContactDetailScreen';
import CompanyListScreen from './src/screens/CompanyListScreen';
import InteractionsScreen from './src/screens/InteractionsScreen';
import EventsList from './src/screens/EventsList';
import SettingsScreen from './src/screens/SettingsScreen';
import { SettingsProvider } from './src/context/SettingsContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AuthLockScreen from './src/screens/AuthLockScreen';
import PinSetupScreen from './src/screens/PinSetupScreen';
import { useSettings } from './src/context/SettingsContext';
import { useColorScheme } from 'react-native';
import i18n from './src/i18n';
import { useTranslation, I18nextProvider } from 'react-i18next';
import QueryProvider from './src/providers/QueryProvider';
import ErrorBoundary from './src/components/ErrorBoundary';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [dbError, setDbError] = useState(null);
  // Must be called unconditionally before any early returns to keep hook order stable
  const colorScheme = useColorScheme();

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

  const MainTabs = ({ navigation }) => {
    const { t, i18n } = useTranslation();
    const { companyManagementEnabled } = useSettings();
    const [index, setIndex] = React.useState(2); // Start on Dashboard

    // Compute routes dynamically based on current language and company management setting
    const routes = React.useMemo(() => {
      // Dashboard in center for prominence
      const routes = [
        { key: 'contacts', title: t('navigation.contacts'), focusedIcon: 'account-box', unfocusedIcon: 'account-box-outline' },
        { key: 'interactions', title: t('navigation.interactions'), focusedIcon: 'message-text', unfocusedIcon: 'message-text-outline' },
        { key: 'dashboard', title: t('navigation.dashboard'), focusedIcon: 'view-dashboard', unfocusedIcon: 'view-dashboard-outline' },
        { key: 'events', title: t('navigation.events'), focusedIcon: 'calendar', unfocusedIcon: 'calendar-outline' },
        { key: 'settings', title: t('navigation.settings'), focusedIcon: 'cog', unfocusedIcon: 'cog-outline' }
      ];

      // If Companies enabled, insert after Contacts (keeps Dashboard centered)
      if (companyManagementEnabled) {
        routes.splice(1, 0, {
          key: 'companies',
          title: 'Companies',
          focusedIcon: 'office-building',
          unfocusedIcon: 'office-building-outline'
        });
      }

      return routes;
    }, [i18n.language, companyManagementEnabled]); // Recompute when language or company setting changes

    // When company management is toggled, adjust index to keep Dashboard selected
    React.useEffect(() => {
      const dashboardIndex = routes.findIndex(r => r.key === 'dashboard');
      if (dashboardIndex !== -1 && index !== dashboardIndex && routes[index]?.key !== 'dashboard') {
        // If we're not already on dashboard and the current tab isn't dashboard, move to dashboard
        const currentTabKey = routes[index]?.key;
        if (!currentTabKey) {
          setIndex(dashboardIndex);
        }
      }
    }, [routes, companyManagementEnabled]);

    // Compute clamped index synchronously during render
    const safeIndex = Math.max(0, Math.min(index, routes.length - 1));

    // Update index state if it's out of bounds (runs after render)
    React.useEffect(() => {
      const clamped = Math.max(0, Math.min(index, routes.length - 1));
      if (clamped !== index) {
        console.log(`[MainTabs] Clamping index from ${index} to ${clamped} (routes.length=${routes.length})`);
        setIndex(clamped);
      }
    }, [index, routes.length]);

    const renderScene = ({ route }) => {
      switch (route.key) {
        case 'dashboard':
          return <DashboardScreen navigation={navigation} />;
        case 'contacts':
          return <ContactsList navigation={navigation} />;
        case 'companies':
          return <CompanyListScreen navigation={navigation} />;
        case 'interactions':
          return <InteractionsScreen />;
        case 'events':
          return <EventsList navigation={navigation} />;
        case 'settings':
          return <SettingsScreen />;
        default:
          return null;
      }
    };

    return (
      <BottomNavigation
        navigationState={{ index: safeIndex, routes }}
        onIndexChange={setIndex}
        renderScene={renderScene}
        labeled
        sceneAnimationEnabled
        renderIcon={({ route, focused, color }) => {
          const iconName = focused ? route.focusedIcon : route.unfocusedIcon;
          // Make Dashboard icon slightly larger for prominence
          const iconSize = route.key === 'dashboard' ? 26 : 24;
          return <Icon source={iconName} size={iconSize} color={color} />;
        }}
      />
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryProvider>
        <SettingsProvider>
          <ThemeBridge colorScheme={colorScheme}>
            <I18nextProvider i18n={i18n}>
              <AuthProvider>
                <AuthGate>
                  <ErrorBoundary>
                    <NavigationContainer>
                      <Stack.Navigator screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="MainTabs" component={MainTabs} />
                        <Stack.Screen name="ContactDetail" component={ContactDetailScreen} />
                        <Stack.Screen name="PinSetup" component={PinSetupScreen} />
                      </Stack.Navigator>
                    </NavigationContainer>
                  </ErrorBoundary>
                </AuthGate>
              </AuthProvider>
            </I18nextProvider>
          </ThemeBridge>
        </SettingsProvider>
      </QueryProvider>
    </GestureHandlerRootView>
  );
}

// Internal component to bridge SettingsContext to Paper theme and StatusBar
function ThemeBridge({ children, colorScheme }) {
  const { themeMode: mode } = useSettings();
  const isDark = mode === 'system' ? colorScheme === 'dark' : mode === 'dark';
  const theme = isDark ? MD3DarkTheme : MD3LightTheme;
  return (
    <PaperProvider theme={theme}>
      {children}
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </PaperProvider>
  );
}

// Simple gate that overlays the lock screen if locked
function AuthGate({ children }) {
  const { isLocked, initializing } = useAuth();
  if (initializing) return children; // don't block initial render
  return (
    <View style={{ flex: 1 }}>
      {children}
      {isLocked ? (
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <AuthLockScreen />
        </View>
      ) : null}
    </View>
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
