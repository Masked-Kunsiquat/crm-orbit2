import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { OrganizationsStackParamList } from "./types";
import { OrganizationsLandingScreen } from "../screens/organizations/OrganizationsLandingScreen";
import { AccountsListScreen } from "../screens/accounts/AccountsListScreen";
import { OrganizationsListScreen } from "../screens/organizations/OrganizationsListScreen";
import { OrganizationDetailScreen } from "../screens/organizations/OrganizationDetailScreen";
import { OrganizationFormScreen } from "../screens/organizations/OrganizationFormScreen";
import { getStackScreenOptions } from "./stackOptions";
import { useTheme } from "../hooks";
import { t } from "@i18n/index";

const Stack = createNativeStackNavigator<OrganizationsStackParamList>();

export const OrganizationsStack = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator screenOptions={getStackScreenOptions(colors)}>
      <Stack.Screen
        name="OrganizationsLanding"
        component={OrganizationsLandingScreen}
        options={{ title: t("screens.accountsAndOrganizations") }}
      />
      <Stack.Screen
        name="AccountsList"
        component={AccountsListScreen}
        options={{ title: t("accounts.title") }}
      />
      <Stack.Screen
        name="OrganizationsList"
        component={OrganizationsListScreen}
        options={{ title: t("organizations.title") }}
      />
      <Stack.Screen
        name="OrganizationDetail"
        component={OrganizationDetailScreen}
        options={{ title: t("screens.organizationDetails") }}
      />
      <Stack.Screen
        name="OrganizationForm"
        component={OrganizationFormScreen}
        options={({ route }) => ({
          title: route.params?.organizationId
            ? t("screens.editOrganization")
            : t("screens.newOrganization"),
        })}
      />
    </Stack.Navigator>
  );
};
