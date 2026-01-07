import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { MiscStackParamList } from "./types";
import { MiscLandingScreen } from "../screens/misc/MiscLandingScreen";
import {
  CalendarSettingsScreen,
  SecuritySettingsScreen,
  SettingsListScreen,
} from "../screens/settings";
import { SyncScreen } from "../screens/SyncScreen";
import { getStackScreenOptions } from "./stackOptions";
import { useTheme } from "../hooks";
import { t } from "@i18n/index";

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
    </Stack.Navigator>
  );
};
