import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { MiscStackParamList } from "./types";
import { MiscLandingScreen } from "../screens/misc/MiscLandingScreen";
import {
  CodeDetailScreen,
  CodeFormScreen,
  CodesListScreen,
} from "../screens/codes";
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
      <Stack.Screen
        name="CodesList"
        component={CodesListScreen}
        options={{ title: "All Codes" }}
      />
      <Stack.Screen
        name="CodeDetail"
        component={CodeDetailScreen}
        options={{ title: "Code Details" }}
      />
      <Stack.Screen
        name="CodeForm"
        component={CodeFormScreen}
        options={({ route }) => ({
          title: route.params?.codeId ? "Edit Code" : "New Code",
        })}
      />
    </Stack.Navigator>
  );
};
