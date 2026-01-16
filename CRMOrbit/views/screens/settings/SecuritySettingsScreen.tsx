import { StyleSheet } from "react-native";
import SegmentedControl from "@react-native-segmented-control/segmented-control";

import { FormField, FormScreenLayout } from "../../components";
import { t } from "@i18n/index";
import { useDeviceId, useTheme } from "../../hooks";
import { useSettingsActions } from "../../hooks/useSettingsActions";
import { useSecuritySettings } from "../../store/store";
import type {
  SecurityAuthFrequency,
  SecurityBiometricSetting,
  SecurityBlurTimeout,
} from "@domains/settings";

export const SecuritySettingsScreen = () => {
  const deviceId = useDeviceId();
  const { colors } = useTheme();
  const settings = useSecuritySettings();
  const { updateSecuritySettings } = useSettingsActions(deviceId);
  const biometricOptions: {
    value: SecurityBiometricSetting;
    label: string;
  }[] = [
    {
      value: "enabled",
      label: t("settings.security.biometric.enabled"),
    },
    {
      value: "disabled",
      label: t("settings.security.biometric.disabled"),
    },
  ];
  const blurTimeoutOptions: { value: SecurityBlurTimeout; label: string }[] = [
    {
      value: "15",
      label: t("settings.security.blurTimeout.15"),
    },
    {
      value: "30",
      label: t("settings.security.blurTimeout.30"),
    },
    {
      value: "60",
      label: t("settings.security.blurTimeout.60"),
    },
    {
      value: "never",
      label: t("settings.security.blurTimeout.never"),
    },
  ];
  const authFrequencyOptions: {
    value: SecurityAuthFrequency;
    label: string;
  }[] = [
    {
      value: "each",
      label: t("settings.security.authFrequency.each"),
    },
    {
      value: "session",
      label: t("settings.security.authFrequency.session"),
    },
  ];
  const getSelectedIndex = <T extends string>(
    options: { value: T; label: string }[],
    value: T,
  ) => {
    const index = options.findIndex((option) => option.value === value);
    return index === -1 ? 0 : index;
  };

  return (
    <FormScreenLayout>
      <FormField label={t("settings.security.biometric.label")}>
        <SegmentedControl
          values={biometricOptions.map((option) => option.label)}
          selectedIndex={getSelectedIndex(
            biometricOptions,
            settings.biometricAuth,
          )}
          onChange={(event) => {
            const nextIndex = event.nativeEvent.selectedSegmentIndex;
            const nextValue =
              biometricOptions[nextIndex]?.value ?? biometricOptions[0].value;
            updateSecuritySettings({ biometricAuth: nextValue });
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

      <FormField label={t("settings.security.blurTimeout.label")}>
        <SegmentedControl
          values={blurTimeoutOptions.map((option) => option.label)}
          selectedIndex={getSelectedIndex(
            blurTimeoutOptions,
            settings.blurTimeout,
          )}
          onChange={(event) => {
            const nextIndex = event.nativeEvent.selectedSegmentIndex;
            const nextValue =
              blurTimeoutOptions[nextIndex]?.value ??
              blurTimeoutOptions[0].value;
            updateSecuritySettings({ blurTimeout: nextValue });
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

      <FormField label={t("settings.security.authFrequency.label")}>
        <SegmentedControl
          values={authFrequencyOptions.map((option) => option.label)}
          selectedIndex={getSelectedIndex(
            authFrequencyOptions,
            settings.authFrequency,
          )}
          onChange={(event) => {
            const nextIndex = event.nativeEvent.selectedSegmentIndex;
            const nextValue =
              authFrequencyOptions[nextIndex]?.value ??
              authFrequencyOptions[0].value;
            updateSecuritySettings({ authFrequency: nextValue });
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
});
