import { useColorScheme } from "react-native";
import {
  APP_PALETTES,
  type ColorScheme,
} from "../../domains/shared/theme/colors";
import { DEFAULT_APPEARANCE_SETTINGS } from "../../domains/settings";
import { useAppearanceSettings } from "../store/store";

/**
 * Hook that returns the appropriate color scheme based on the system theme setting.
 *
 * @returns An object containing the current color scheme and a boolean indicating if dark mode is active
 */
export const useTheme = (): { colors: ColorScheme; isDark: boolean } => {
  const appearance = useAppearanceSettings();
  const colorScheme = useColorScheme();
  const paletteId = appearance?.palette ?? DEFAULT_APPEARANCE_SETTINGS.palette;
  const resolvedPalette =
    APP_PALETTES[paletteId] ??
    APP_PALETTES[DEFAULT_APPEARANCE_SETTINGS.palette];
  const resolvedMode = appearance?.mode ?? DEFAULT_APPEARANCE_SETTINGS.mode;
  const isDark =
    resolvedMode === "system"
      ? colorScheme === "dark"
      : resolvedMode === "dark";

  return {
    colors: isDark ? resolvedPalette.dark : resolvedPalette.light,
    isDark,
  };
};
