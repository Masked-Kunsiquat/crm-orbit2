import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import type { ColorScheme } from "@domains/shared/theme/colors";

/**
 * Returns stack screen options configured with the provided color scheme.
 *
 * @param colors - The color scheme to apply to the navigation header
 * @returns Navigation options for native stack screens
 */
export const getStackScreenOptions = (
  colors: ColorScheme,
): NativeStackNavigationOptions => ({
  headerStyle: { backgroundColor: colors.headerBackground },
  headerTintColor: colors.headerTint,
  headerTitleStyle: { fontWeight: "600" },
  contentStyle: { backgroundColor: colors.canvas },
});
