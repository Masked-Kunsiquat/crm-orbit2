import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { ContactsStackParamList } from "./types";
import { ContactsListScreen } from "../screens/contacts/ContactsListScreen";
import { ContactDetailScreen } from "../screens/contacts/ContactDetailScreen";
import { ContactFormScreen } from "../screens/contacts/ContactFormScreen";

const Stack = createNativeStackNavigator<ContactsStackParamList>();

export const ContactsStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#1f5eff" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "600" },
      }}
    >
      <Stack.Screen
        name="ContactsList"
        component={ContactsListScreen}
        options={{ title: "Contacts" }}
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
    </Stack.Navigator>
  );
};
