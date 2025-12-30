import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { AccountsStackParamList } from "./types";
import { AccountsListScreen } from "../screens/accounts/AccountsListScreen";
import { AccountDetailScreen } from "../screens/accounts/AccountDetailScreen";
import { AccountFormScreen } from "../screens/accounts/AccountFormScreen";

const Stack = createNativeStackNavigator<AccountsStackParamList>();

export const AccountsStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: "#f4f2ee" },
        headerTintColor: "#1b1b1b",
      }}
    >
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
