import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { MiscStackParamList } from "./types";
import { MiscLandingScreen } from "../screens/misc/MiscLandingScreen";
import { RandomizerScreen } from "../screens/misc/RandomizerScreen";
import {
  AppearanceSettingsScreen,
  CalendarSettingsScreen,
  BackupSettingsScreen,
  SecuritySettingsScreen,
  SettingsListScreen,
} from "../screens/settings";
import { SyncScreen } from "../screens/SyncScreen";
import { getStackScreenOptions } from "./stackOptions";
import { useMiscStackTitles, useTheme } from "../hooks";

const Stack = createNativeStackNavigator<MiscStackParamList>();

export const MiscStack = () => {
  const { colors } = useTheme();
  const titles = useMiscStackTitles();

  return (
    <Stack.Navigator screenOptions={getStackScreenOptions(colors)}>
      <Stack.Screen
        name="MiscLanding"
        component={MiscLandingScreen}
        options={{ title: titles.misc }}
      />
      <Stack.Screen
        name="SettingsList"
        component={SettingsListScreen}
        options={{ title: titles.settings }}
      />
      <Stack.Screen
        name="Sync"
        component={SyncScreen}
        options={{ title: titles.sync }}
      />
      <Stack.Screen
        name="Randomizer"
        component={RandomizerScreen}
        options={{ title: titles.randomizer }}
      />
      <Stack.Screen
        name="BackupSettings"
        component={BackupSettingsScreen}
        options={{ title: titles.backup }}
      />
      <Stack.Screen
        name="SecuritySettings"
        component={SecuritySettingsScreen}
        options={{ title: titles.security }}
      />
      <Stack.Screen
        name="CalendarSettings"
        component={CalendarSettingsScreen}
        options={{ title: titles.calendar }}
      />
      <Stack.Screen
        name="AppearanceSettings"
        component={AppearanceSettingsScreen}
        options={{ title: titles.appearance }}
      />
    </Stack.Navigator>
  );
};
