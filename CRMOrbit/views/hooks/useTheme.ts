import { useColorScheme } from "react-native";
import {
  lightColors,
  darkColors,
  type ColorScheme,
} from "../../domains/shared/theme/colors";

/**
 * Hook that returns the appropriate color scheme based on the system theme setting.
 *
 * @returns An object containing the current color scheme and a boolean indicating if dark mode is active
 */
export const useTheme = (): { colors: ColorScheme; isDark: boolean } => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return {
    colors: isDark ? darkColors : lightColors,
    isDark,
  };
};
