import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { AccountsStackParamList } from "./types";
import { AccountsListScreen } from "../screens/accounts/AccountsListScreen";
import { AccountDetailScreen } from "../screens/accounts/AccountDetailScreen";
import { AccountFormScreen } from "../screens/accounts/AccountFormScreen";
import { getStackScreenOptions } from "./stackOptions";
import { useTheme } from "../hooks";

const Stack = createNativeStackNavigator<AccountsStackParamList>();

export const AccountsStack = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator screenOptions={getStackScreenOptions(colors)}>
      <Stack.Screen
        name="AccountsList"
        component={AccountsListScreen}
        options={{ title: "Accounts" }}
      />
      <Stack.Screen
        name="AccountDetail"
        component={AccountDetailScreen}
        options={{ title: "Account Details" }}
      />
      <Stack.Screen
        name="AccountForm"
        component={AccountFormScreen}
        options={({ route }) => ({
          title: route.params?.accountId ? "Edit Account" : "New Account",
        })}
      />
    </Stack.Navigator>
  );
};
