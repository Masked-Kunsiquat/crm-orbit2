import { Pressable, StyleSheet, Text, View } from "react-native";

import { t } from "@i18n/index";
import {
  FormField,
  FormScreenLayout,
  SegmentedOptionGroup,
} from "../../components";
import { useDeviceId, useTheme } from "../../hooks";
import { useSettingsActions } from "../../hooks/useSettingsActions";
import { useAppearanceSettings } from "../../store/store";
import { APP_PALETTES } from "@domains/shared/theme/colors";
import { APP_PALETTE_I18N_KEYS } from "@i18n/enums";

export const AppearanceSettingsScreen = () => {
  const deviceId = useDeviceId();
  const { colors, isDark } = useTheme();
  const appearance = useAppearanceSettings();
  const { updateAppearanceSettings } = useSettingsActions(deviceId);

  const paletteOptions = Object.values(APP_PALETTES).map((palette) => {
    const preview = isDark ? palette.dark : palette.light;
    return {
      id: palette.id,
      label: t(APP_PALETTE_I18N_KEYS[palette.id]),
      preview,
    };
  });

  return (
    <FormScreenLayout>
      <FormField label={t("settings.appearance.mode.label")}>
        <SegmentedOptionGroup
          options={[
            {
              value: "system",
              label: t("settings.appearance.mode.system"),
            },
            {
              value: "light",
              label: t("settings.appearance.mode.light"),
            },
            {
              value: "dark",
              label: t("settings.appearance.mode.dark"),
            },
          ]}
          value={appearance.mode}
          onChange={(value) => updateAppearanceSettings({ mode: value })}
        />
      </FormField>

      <FormField
        label={t("settings.appearance.palette.label")}
        hint={t("settings.appearance.palette.hint")}
      >
        <View style={styles.paletteList}>
          {paletteOptions.map((palette) => {
            const isSelected = palette.id === appearance.palette;
            return (
              <Pressable
                key={palette.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  if (!isSelected) {
                    updateAppearanceSettings({ palette: palette.id });
                  }
                }}
                style={({ pressed }) => [
                  styles.paletteCard,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: isSelected
                      ? colors.accent
                      : colors.borderLight,
                  },
                  pressed && styles.paletteCardPressed,
                ]}
              >
                <Text
                  style={[styles.paletteLabel, { color: colors.textPrimary }]}
                >
                  {palette.label}
                </Text>
                <View style={styles.swatchRow}>
                  <View
                    style={[
                      styles.swatch,
                      {
                        backgroundColor: palette.preview.accent,
                        borderColor: colors.borderLight,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.swatch,
                      {
                        backgroundColor: palette.preview.surface,
                        borderColor: colors.borderLight,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.swatch,
                      {
                        backgroundColor: palette.preview.textPrimary,
                        borderColor: colors.borderLight,
                      },
                    ]}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
      </FormField>
    </FormScreenLayout>
  );
};

const styles = StyleSheet.create({
  paletteList: {
    gap: 12,
  },
  paletteCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  paletteCardPressed: {
    opacity: 0.9,
  },
  paletteLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },
  swatchRow: {
    flexDirection: "row",
    gap: 8,
  },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
  },
});
