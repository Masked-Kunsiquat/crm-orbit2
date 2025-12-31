import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import type { RootTabParamList } from "./types";
import { OrganizationsStack } from "./OrganizationsStack";
import { AccountsStack } from "./AccountsStack";
import { ContactsStack } from "./ContactsStack";
import { NotesScreen, InteractionsScreen } from "../screens";

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
        component={AccountsStack}
        options={{ tabBarLabel: "Accounts" }}
      />
      <Tab.Screen
        name="ContactsTab"
        component={ContactsStack}
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
