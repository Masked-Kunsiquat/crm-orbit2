// Main navigation component for authenticated users
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { BottomNavigation, BottomNavigationTab, Icon, Layout, Text } from '@ui-kitten/components';

// Screens
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Placeholder screens for now
const ContactsScreen = () => (
  <Layout style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
    <Text category="h4">Contacts</Text>
    <Text category="p1" style={{ textAlign: 'center', marginTop: 8 }}>
      Contact management coming soon...
    </Text>
    <Text category="p2" appearance="hint" style={{ textAlign: 'center', marginTop: 16 }}>
      This will include contact CRUD, categories, and company relationships.
    </Text>
  </Layout>
);

const EventsScreen = () => (
  <Layout style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
    <Text category="h4">Events</Text>
    <Text category="p1" style={{ textAlign: 'center', marginTop: 8 }}>
      Event scheduling coming soon...
    </Text>
    <Text category="p2" appearance="hint" style={{ textAlign: 'center', marginTop: 16 }}>
      This will include event management, reminders, and recurring events.
    </Text>
  </Layout>
);

const NotesScreen = () => (
  <Layout style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
    <Text category="h4">Notes</Text>
    <Text category="p1" style={{ textAlign: 'center', marginTop: 8 }}>
      Note taking coming soon...
    </Text>
    <Text category="p2" appearance="hint" style={{ textAlign: 'center', marginTop: 16 }}>
      This will include general notes, contact notes, and pinned notes.
    </Text>
  </Layout>
);

// Custom tab bar component using UI Kitten
const BottomTabBar = ({ navigation, state }) => (
  <BottomNavigation
    selectedIndex={state.index}
    onSelect={index => navigation.navigate(state.routeNames[index])}
  >
    <BottomNavigationTab 
      title="Contacts"
      icon={props => <Icon {...props} name="person-outline" />}
    />
    <BottomNavigationTab 
      title="Events"
      icon={props => <Icon {...props} name="calendar-outline" />}
    />
    <BottomNavigationTab 
      title="Notes"
      icon={props => <Icon {...props} name="edit-outline" />}
    />
    <BottomNavigationTab 
      title="Settings"
      icon={props => <Icon {...props} name="settings-outline" />}
    />
  </BottomNavigation>
);

// Main tab navigator
const MainTabs = () => (
  <Tab.Navigator
    tabBar={props => <BottomTabBar {...props} />}
    screenOptions={{ headerShown: false }}
  >
    <Tab.Screen name="Contacts" component={ContactsScreen} />
    <Tab.Screen name="Events" component={EventsScreen} />
    <Tab.Screen name="Notes" component={NotesScreen} />
    <Tab.Screen name="Settings" component={SettingsScreen} />
  </Tab.Navigator>
);

// Main navigator (could add stack screens later for detail views)
const MainNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
    </Stack.Navigator>
  </NavigationContainer>
);

export default MainNavigator;