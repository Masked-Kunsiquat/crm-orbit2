import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { PaperProvider, MD3LightTheme, Text, Card, BottomNavigation } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { initDatabase } from './src/database';
import { createBasicTables } from './src/database/simpleSetup';
import ContactsList from './src/screens/ContactsList';
import ContactDetailScreen from './src/screens/ContactDetailScreen';
import InteractionsScreen from './src/screens/InteractionsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { SettingsProvider } from './src/context/SettingsContext';

const Stack = createNativeStackNavigator();

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

  const MainTabs = ({ navigation }) => {
    const [index, setIndex] = React.useState(0);
    const [routes] = React.useState([
      { key: 'contacts', title: 'Contacts', focusedIcon: 'account-box', unfocusedIcon: 'account-box-outline' },
      { key: 'interactions', title: 'Interactions', focusedIcon: 'message-text', unfocusedIcon: 'message-text-outline' },
      { key: 'settings', title: 'Settings', focusedIcon: 'cog', unfocusedIcon: 'cog-outline' },
    ]);

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
      <PaperProvider theme={MD3LightTheme}>
        <SettingsProvider>
          <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="MainTabs" component={MainTabs} />
              <Stack.Screen name="ContactDetail" component={ContactDetailScreen} />
            </Stack.Navigator>
          </NavigationContainer>
          <StatusBar style="auto" />
        </SettingsProvider>
      </PaperProvider>
    </GestureHandlerRootView>
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
