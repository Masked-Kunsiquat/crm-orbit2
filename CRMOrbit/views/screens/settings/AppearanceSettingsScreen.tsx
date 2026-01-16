import { Pressable, StyleSheet, Text, View } from "react-native";
import SegmentedControl from "@react-native-segmented-control/segmented-control";

import { t } from "@i18n/index";
import { FormField, FormScreenLayout } from "../../components";
import { useDeviceId, useTheme } from "../../hooks";
import { useSettingsActions } from "../../hooks/useSettingsActions";
import { useAppearanceSettings } from "../../store/store";
import { APP_PALETTES } from "@domains/shared/theme/colors";
import { APP_PALETTE_I18N_KEYS } from "@i18n/enums";
import type { AppearanceThemeMode } from "@domains/settings";

export const AppearanceSettingsScreen = () => {
  const deviceId = useDeviceId();
  const { colors, isDark } = useTheme();
  const appearance = useAppearanceSettings();
  const { updateAppearanceSettings } = useSettingsActions(deviceId);
  const modeOptions: { value: AppearanceThemeMode; label: string }[] = [
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
  ];

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
        <SegmentedControl
          values={modeOptions.map((option) => option.label)}
          selectedIndex={Math.max(
            0,
            modeOptions.findIndex((option) => option.value === appearance.mode),
          )}
          onChange={(event) => {
            const nextIndex = event.nativeEvent.selectedSegmentIndex;
            const nextValue =
              modeOptions[nextIndex]?.value ?? modeOptions[0].value;
            updateAppearanceSettings({ mode: nextValue });
          }}
          tintColor={colors.accent}
          backgroundColor={colors.surface}
          fontStyle={{
            color: colors.textSecondary,
            fontSize: 12,
            fontWeight: "600",
          }}
          activeFontStyle={{
            color: colors.onAccent,
            fontSize: 12,
            fontWeight: "600",
          }}
          style={styles.segmentedControl}
          tabStyle={styles.segmentedTab}
          sliderStyle={{ backgroundColor: colors.accent }}
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
  segmentedControl: {
    minHeight: 36,
  },
  segmentedTab: {
    paddingVertical: 6,
  },
  paletteList: {
    gap: 12,
  },
  paletteCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  paletteCardPressed: {
    opacity: 0.9,
  },
  paletteLabel: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    marginRight: 12,
  },
  swatchRow: {
    flexDirection: "row",
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
  },
});
