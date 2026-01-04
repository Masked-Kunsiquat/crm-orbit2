import {
  FormField,
  FormScreenLayout,
  SegmentedOptionGroup,
} from "../../components";
import { t } from "@i18n/index";
import { useDeviceId } from "../../hooks";
import { useSettingsActions } from "../../hooks/useSettingsActions";
import { useSecuritySettings } from "../../store/store";

export const SecuritySettingsScreen = () => {
  const deviceId = useDeviceId();
  const settings = useSecuritySettings();
  const { updateSecuritySettings } = useSettingsActions(deviceId);

  return (
    <FormScreenLayout>
      <FormField label={t("settings.security.biometric.label")}>
        <SegmentedOptionGroup
          options={[
            {
              value: "enabled",
              label: t("settings.security.biometric.enabled"),
            },
            {
              value: "disabled",
              label: t("settings.security.biometric.disabled"),
            },
          ]}
          value={settings.biometricAuth}
          onChange={(value) =>
            updateSecuritySettings({ biometricAuth: value })
          }
        />
      </FormField>

      <FormField label={t("settings.security.blurTimeout.label")}>
        <SegmentedOptionGroup
          options={[
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
          ]}
          value={settings.blurTimeout}
          onChange={(value) => updateSecuritySettings({ blurTimeout: value })}
        />
      </FormField>

      <FormField label={t("settings.security.authFrequency.label")}>
        <SegmentedOptionGroup
          options={[
            {
              value: "each",
              label: t("settings.security.authFrequency.each"),
            },
            {
              value: "session",
              label: t("settings.security.authFrequency.session"),
            },
          ]}
          value={settings.authFrequency}
          onChange={(value) =>
            updateSecuritySettings({ authFrequency: value })
          }
        />
      </FormField>
    </FormScreenLayout>
  );
};
