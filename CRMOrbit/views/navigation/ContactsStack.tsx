import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { ContactsStackParamList } from "./types";
import { ContactsListScreen } from "../screens/contacts/ContactsListScreen";
import { ContactDetailScreen } from "../screens/contacts/ContactDetailScreen";
import { ContactFormScreen } from "../screens/contacts/ContactFormScreen";
import { ContactsImportScreen } from "../screens/contacts/ContactsImportScreen";
import { getStackScreenOptions } from "./stackOptions";
import { useContactsStackTitles, useTheme } from "../hooks";

const Stack = createNativeStackNavigator<ContactsStackParamList>();

export const ContactsStack = () => {
  const { colors } = useTheme();
  const titles = useContactsStackTitles();

  return (
    <Stack.Navigator screenOptions={getStackScreenOptions(colors)}>
      <Stack.Screen
        name="ContactsList"
        component={ContactsListScreen}
        options={{ title: titles.list }}
      />
      <Stack.Screen
        name="ContactDetail"
        component={ContactDetailScreen}
        options={{ title: titles.detail }}
      />
      <Stack.Screen
        name="ContactForm"
        component={ContactFormScreen}
        options={({ route }) => ({
          title: route.params?.contactId ? titles.formEdit : titles.formNew,
        })}
      />
      <Stack.Screen
        name="ContactsImport"
        component={ContactsImportScreen}
        options={{ title: titles.import }}
      />
    </Stack.Navigator>
  );
};
