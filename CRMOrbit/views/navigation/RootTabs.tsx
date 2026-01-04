import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import type { RootTabParamList } from "./types";
import { OrganizationsStack } from "./OrganizationsStack";
import { AccountsStack } from "./AccountsStack";
import { ContactsStack } from "./ContactsStack";
import { NotesStack } from "./NotesStack";
import { MiscStack } from "./MiscStack";
import { useTheme } from "../hooks";

const Tab = createBottomTabNavigator<RootTabParamList>();

const TAB_ICON_SIZES: Record<keyof RootTabParamList, number> = {
  OrganizationsTab: 24,
  AccountsTab: 24,
  ContactsTab: 24,
  NotesTab: 24,
  MiscTab: 24,
};

export const RootTabs = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarIcon: ({ color, size }) => {
          const iconSize = TAB_ICON_SIZES[route.name] ?? size;
          switch (route.name) {
            case "OrganizationsTab":
              return (
                <Ionicons
                  name="business-outline"
                  size={iconSize}
                  color={color}
                />
              );
            case "AccountsTab":
              return (
                <MaterialCommunityIcons
                  name="home-city-outline"
                  size={iconSize}
                  color={color}
                />
              );
            case "ContactsTab":
              return (
                <FontAwesome5
                  name="address-book"
                  size={iconSize}
                  color={color}
                />
              );
            case "NotesTab":
              return (
                <MaterialCommunityIcons
                  name="notebook-outline"
                  size={iconSize}
                  color={color}
                />
              );
            case "MiscTab":
              return (
                <MaterialCommunityIcons
                  name="lightning-bolt-outline"
                  size={iconSize}
                  color={color}
                />
              );
            default:
              return null;
          }
        },
      })}
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
        component={NotesStack}
        options={{ tabBarLabel: "Notes" }}
      />
      <Tab.Screen
        name="MiscTab"
        component={MiscStack}
        options={{ tabBarLabel: "Misc" }}
      />
    </Tab.Navigator>
  );
};
