// Main navigation component for authenticated users
import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';

// Screens
import SettingsScreen from '../screens/SettingsScreen';
import { useAppTheme } from '../contexts/ThemeContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Placeholder screens for now
const ContactsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
    <Text variant="headlineSmall">Contacts</Text>
    <Text variant="bodyMedium" style={{ textAlign: 'center', marginTop: 8 }}>
      Contact management coming soon...
    </Text>
    <Text variant="bodySmall" style={{ textAlign: 'center', marginTop: 16, opacity: 0.7 }}>
      This will include contact CRUD, categories, and company relationships.
    </Text>
  </View>
);

const EventsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
    <Text variant="headlineSmall">Events</Text>
    <Text variant="bodyMedium" style={{ textAlign: 'center', marginTop: 8 }}>
      Event scheduling coming soon...
    </Text>
    <Text variant="bodySmall" style={{ textAlign: 'center', marginTop: 16, opacity: 0.7 }}>
      This will include event management, reminders, and recurring events.
    </Text>
  </View>
);

const NotesScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
    <Text variant="headlineSmall">Notes</Text>
    <Text variant="bodyMedium" style={{ textAlign: 'center', marginTop: 8 }}>
      Note taking coming soon...
    </Text>
    <Text variant="bodySmall" style={{ textAlign: 'center', marginTop: 16, opacity: 0.7 }}>
      This will include general notes, contact notes, and pinned notes.
    </Text>
  </View>
);

// Main tab navigator
const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ color, size }) => {
        let iconName = 'help-circle-outline';
        switch (route.name) {
          case 'Contacts':
            iconName = 'person-outline';
            break;
          case 'Events':
            iconName = 'calendar-outline';
            break;
          case 'Notes':
            iconName = 'create-outline';
            break;
          case 'Settings':
            iconName = 'settings-outline';
            break;
        }
        return <Ionicons name={iconName} size={size} color={color} />;
      },
    })}
  >
    <Tab.Screen name="Contacts" component={ContactsScreen} />
    <Tab.Screen name="Events" component={EventsScreen} />
    <Tab.Screen name="Notes" component={NotesScreen} />
    <Tab.Screen name="Settings" component={SettingsScreen} />
  </Tab.Navigator>
);

// Main navigator (could add stack screens later for detail views)
const MainNavigator = () => {
  const { navigationTheme } = useAppTheme();
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default MainNavigator;
