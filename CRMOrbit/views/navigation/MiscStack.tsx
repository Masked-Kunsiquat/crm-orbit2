import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { MiscStackParamList } from "./types";
import { MiscLandingScreen } from "../screens/misc/MiscLandingScreen";
import { getStackScreenOptions } from "./stackOptions";
import { useTheme } from "../hooks";

const Stack = createNativeStackNavigator<MiscStackParamList>();

export const MiscStack = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator screenOptions={getStackScreenOptions(colors)}>
      <Stack.Screen
        name="MiscLanding"
        component={MiscLandingScreen}
        options={{ title: "Miscellaneous" }}
      />
    </Stack.Navigator>
  );
};
