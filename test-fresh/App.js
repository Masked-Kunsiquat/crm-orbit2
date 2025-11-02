import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { PaperProvider, MD3LightTheme, MD3DarkTheme, Text, Card, BottomNavigation } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { initDatabase } from './src/database';
import { createBasicTables } from './src/database/simpleSetup';
import ContactsList from './src/screens/ContactsList';
import ContactDetailScreen from './src/screens/ContactDetailScreen';
import InteractionsScreen from './src/screens/InteractionsScreen';
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
    const { t } = useTranslation();
    const [index, setIndex] = React.useState(0);
    const [routes, setRoutes] = React.useState([
      { key: 'contacts', title: t('navigation.contacts'), focusedIcon: 'account-box', unfocusedIcon: 'account-box-outline' },
      { key: 'interactions', title: t('navigation.interactions'), focusedIcon: 'message-text', unfocusedIcon: 'message-text-outline' },
      { key: 'settings', title: t('navigation.settings'), focusedIcon: 'cog', unfocusedIcon: 'cog-outline' },
    ]);

    // Update route titles on language change
    React.useEffect(() => {
      setRoutes((r) => r.map(rt => ({ ...rt, title: t(`navigation.${rt.key}`) })));
    }, [t]);

    const renderScene = ({ route }) => {
      switch (route.key) {
        case 'contacts':
          return <ContactsList navigation={navigation} />;
        case 'interactions':
          return <InteractionsScreen />;
        case 'settings':
          return <SettingsScreen />;
        default:
          return null;
      }
    };

    return (
      <BottomNavigation
        navigationState={{ index, routes }}
        onIndexChange={setIndex}
        renderScene={renderScene}
        labeled
        sceneAnimationEnabled
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
                  <NavigationContainer>
                    <Stack.Navigator screenOptions={{ headerShown: false }}>
                      <Stack.Screen name="MainTabs" component={MainTabs} />
                      <Stack.Screen name="ContactDetail" component={ContactDetailScreen} />
                      <Stack.Screen name="PinSetup" component={PinSetupScreen} />
                    </Stack.Navigator>
                  </NavigationContainer>
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
