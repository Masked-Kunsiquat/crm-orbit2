import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { RootStackParamList } from "./types";
import { stackScreenOptions } from "./stackOptions";
import { RootTabs } from "./RootTabs";
import { OrganizationDetailScreen } from "../screens/organizations/OrganizationDetailScreen";
import { OrganizationFormScreen } from "../screens/organizations/OrganizationFormScreen";
import { AccountDetailScreen } from "../screens/accounts/AccountDetailScreen";
import { AccountFormScreen } from "../screens/accounts/AccountFormScreen";
import { ContactDetailScreen } from "../screens/contacts/ContactDetailScreen";
import { ContactFormScreen } from "../screens/contacts/ContactFormScreen";
import { NoteDetailScreen } from "../screens/notes/NoteDetailScreen";
import { NoteFormScreen } from "../screens/notes/NoteFormScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootStack = () => {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="RootTabs"
        component={RootTabs}
        options={{ headerShown: false }}
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
      <Stack.Screen
        name="ContactDetail"
        component={ContactDetailScreen}
        options={{ title: "Contact Details" }}
      />
      <Stack.Screen
        name="ContactForm"
        component={ContactFormScreen}
        options={({ route }) => ({
          title: route.params?.contactId ? "Edit Contact" : "New Contact",
        })}
      />
      <Stack.Screen
        name="NoteDetail"
        component={NoteDetailScreen}
        options={{ title: "Note Details" }}
      />
      <Stack.Screen
        name="NoteForm"
        component={NoteFormScreen}
        options={({ route }) => ({
          title: route.params?.noteId ? "Edit Note" : "New Note",
        })}
      />
    </Stack.Navigator>
  );
};
