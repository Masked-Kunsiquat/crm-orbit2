import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { RootStackParamList } from "./types";
import { getStackScreenOptions } from "./stackOptions";
import { RootTabs } from "./RootTabs";
import { OrganizationDetailScreen } from "../screens/organizations/OrganizationDetailScreen";
import { OrganizationFormScreen } from "../screens/organizations/OrganizationFormScreen";
import { AccountDetailScreen } from "../screens/accounts/AccountDetailScreen";
import { AccountFloorsVisitedScreen } from "../screens/accounts/AccountFloorsVisitedScreen";
import { AccountFormScreen } from "../screens/accounts/AccountFormScreen";
import { ContactDetailScreen } from "../screens/contacts/ContactDetailScreen";
import { ContactFormScreen } from "../screens/contacts/ContactFormScreen";
import { NoteDetailScreen } from "../screens/notes/NoteDetailScreen";
import { NoteFormScreen } from "../screens/notes/NoteFormScreen";
import {
  InteractionDetailScreen,
  InteractionFormScreen,
} from "../screens/interactions";
import { CodeDetailScreen, CodeFormScreen } from "../screens/codes";
import { AuditDetailScreen, AuditFormScreen } from "../screens/audits";
import { t } from "@i18n/index";
import { useTheme } from "../hooks";

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootStack = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator screenOptions={getStackScreenOptions(colors)}>
      <Stack.Screen
        name="RootTabs"
        component={RootTabs}
        options={{ headerShown: false }}
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
      <Stack.Screen
        name="AccountDetail"
        component={AccountDetailScreen}
        options={{ title: t("screens.accountDetails") }}
      />
      <Stack.Screen
        name="AccountFloorsVisited"
        component={AccountFloorsVisitedScreen}
        options={{ title: t("audits.fields.floorsVisited") }}
      />
      <Stack.Screen
        name="AccountForm"
        component={AccountFormScreen}
        options={({ route }) => ({
          title: route.params?.accountId
            ? t("screens.editAccount")
            : t("screens.newAccount"),
        })}
      />
      <Stack.Screen
        name="ContactDetail"
        component={ContactDetailScreen}
        options={{ title: t("screens.contactDetails") }}
      />
      <Stack.Screen
        name="ContactForm"
        component={ContactFormScreen}
        options={({ route }) => ({
          title: route.params?.contactId
            ? t("screens.editContact")
            : t("screens.newContact"),
        })}
      />
      <Stack.Screen
        name="NoteDetail"
        component={NoteDetailScreen}
        options={{ title: t("screens.noteDetails") }}
      />
      <Stack.Screen
        name="NoteForm"
        component={NoteFormScreen}
        options={({ route }) => ({
          title: route.params?.noteId
            ? t("screens.editNote")
            : t("screens.newNote"),
        })}
      />
      <Stack.Screen
        name="InteractionDetail"
        component={InteractionDetailScreen}
        options={{ title: t("screens.interactionDetails") }}
      />
      <Stack.Screen
        name="InteractionForm"
        component={InteractionFormScreen}
        options={({ route }) => ({
          title: route.params?.interactionId
            ? t("screens.editInteraction")
            : t("screens.newInteraction"),
        })}
      />
      <Stack.Screen
        name="CodeDetail"
        component={CodeDetailScreen}
        options={{ title: t("screens.codeDetails") }}
      />
      <Stack.Screen
        name="CodeForm"
        component={CodeFormScreen}
        options={({ route }) => ({
          title: route.params?.codeId
            ? t("screens.editCode")
            : t("screens.newCode"),
        })}
      />
      <Stack.Screen
        name="AuditForm"
        component={AuditFormScreen}
        options={({ route }) => ({
          title: route.params?.auditId
            ? t("screens.editAudit")
            : t("screens.newAudit"),
        })}
      />
      <Stack.Screen
        name="AuditDetail"
        component={AuditDetailScreen}
        options={{ title: t("screens.auditDetails") }}
      />
    </Stack.Navigator>
  );
};
