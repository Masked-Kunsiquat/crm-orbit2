import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import type { RootTabParamList } from "./types";
import { OrganizationsStack } from "./OrganizationsStack";
import {
  AccountsScreen,
  ContactsScreen,
  NotesScreen,
  InteractionsScreen,
} from "../screens";

const Tab = createBottomTabNavigator<RootTabParamList>();

export const RootTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#1f5eff",
        tabBarInactiveTintColor: "#666",
      }}
    >
      <Tab.Screen
        name="OrganizationsTab"
        component={OrganizationsStack}
        options={{ tabBarLabel: "Organizations" }}
      />
      <Tab.Screen
        name="AccountsTab"
        component={AccountsScreen}
        options={{ tabBarLabel: "Accounts" }}
      />
      <Tab.Screen
        name="ContactsTab"
        component={ContactsScreen}
        options={{ tabBarLabel: "Contacts" }}
      />
      <Tab.Screen
        name="NotesTab"
        component={NotesScreen}
        options={{ tabBarLabel: "Notes" }}
      />
      <Tab.Screen
        name="InteractionsTab"
        component={InteractionsScreen}
        options={{ tabBarLabel: "Interactions" }}
      />
    </Tab.Navigator>
  );
};
