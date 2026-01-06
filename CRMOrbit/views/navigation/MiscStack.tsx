import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { MiscStackParamList } from "./types";
import { MiscLandingScreen } from "../screens/misc/MiscLandingScreen";
import {
  CodeDetailScreen,
  CodeFormScreen,
  CodesListScreen,
} from "../screens/codes";
import { AuditDetailScreen, AuditsListScreen } from "../screens/audits";
import {
  CalendarSettingsScreen,
  SecuritySettingsScreen,
  SettingsListScreen,
} from "../screens/settings";
import { SyncScreen } from "../screens/SyncScreen";
import { getStackScreenOptions } from "./stackOptions";
import { useTheme } from "../hooks";
import { t } from "@i18n/index";
import { CalendarScreen } from "../screens/calendar";
import {
  InteractionDetailScreen,
  InteractionFormScreen,
} from "../screens/interactions";

const Stack = createNativeStackNavigator<MiscStackParamList>();

export const MiscStack = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator screenOptions={getStackScreenOptions(colors)}>
      <Stack.Screen
        name="MiscLanding"
        component={MiscLandingScreen}
        options={{ title: t("screens.miscellaneous") }}
      />
      <Stack.Screen
        name="SettingsList"
        component={SettingsListScreen}
        options={{ title: t("settings.title") }}
      />
      <Stack.Screen
        name="Sync"
        component={SyncScreen}
        options={{ title: t("sync.title") }}
      />
      <Stack.Screen
        name="SecuritySettings"
        component={SecuritySettingsScreen}
        options={{ title: t("settings.security.title") }}
      />
      <Stack.Screen
        name="CalendarSettings"
        component={CalendarSettingsScreen}
        options={{ title: t("settings.calendar.title") }}
      />
      <Stack.Screen
        name="CodesList"
        component={CodesListScreen}
        options={{ title: t("codes.listTitle") }}
      />
      <Stack.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ title: t("screens.calendar") }}
      />
      <Stack.Screen
        name="AuditsList"
        component={AuditsListScreen}
        options={{ title: t("audits.listTitle") }}
      />
      <Stack.Screen
        name="AuditDetail"
        component={AuditDetailScreen}
        options={{ title: t("screens.auditDetails") }}
      />
      <Stack.Screen
        name="InteractionDetail"
        component={InteractionDetailScreen}
        options={{ title: t("screens.interactionDetails") }}
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
        name="InteractionForm"
        component={InteractionFormScreen}
        options={({ route }) => ({
          title: route.params?.interactionId
            ? t("screens.editInteraction")
            : t("screens.newInteraction"),
        })}
      />
    </Stack.Navigator>
  );
};
