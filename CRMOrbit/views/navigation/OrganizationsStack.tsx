import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { OrganizationsStackParamList } from "./types";
import { OrganizationsListScreen } from "../screens/organizations/OrganizationsListScreen";
import { OrganizationDetailScreen } from "../screens/organizations/OrganizationDetailScreen";
import { OrganizationFormScreen } from "../screens/organizations/OrganizationFormScreen";
import { getStackScreenOptions } from "./stackOptions";
import { useTheme } from "../hooks";

const Stack = createNativeStackNavigator<OrganizationsStackParamList>();

export const OrganizationsStack = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator screenOptions={getStackScreenOptions(colors)}>
      <Stack.Screen
        name="OrganizationsList"
        component={OrganizationsListScreen}
        options={{ title: "Organizations" }}
      />
      <Stack.Screen
        name="OrganizationDetail"
        component={OrganizationDetailScreen}
        options={{ title: "Organization Details" }}
      />
      <Stack.Screen
        name="OrganizationForm"
        component={OrganizationFormScreen}
        options={({ route }) => ({
          title: route.params?.organizationId
            ? "Edit Organization"
            : "New Organization",
        })}
      />
    </Stack.Navigator>
  );
};
