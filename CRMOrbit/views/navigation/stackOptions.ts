import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";

import { colors } from "../../domains/shared/theme/colors"

export const stackScreenOptions: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: colors.headerBackground },
  headerTintColor: colors.headerTint,
  headerTitleStyle: { fontWeight: "600" },
};
