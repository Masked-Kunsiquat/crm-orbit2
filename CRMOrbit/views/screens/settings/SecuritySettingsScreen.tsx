import { useState } from "react";

import { FormField, FormScreenLayout, SegmentedOptionGroup } from "../../components";
import { t } from "@i18n/index";

type BiometricSetting = "enabled" | "disabled";
type BlurTimeoutSetting = "15" | "30" | "60" | "never";
type AuthFrequencySetting = "each" | "session";

export const SecuritySettingsScreen = () => {
  const [biometricSetting, setBiometricSetting] =
    useState<BiometricSetting>("enabled");
  const [blurTimeout, setBlurTimeout] = useState<BlurTimeoutSetting>("30");
  const [authFrequency, setAuthFrequency] =
    useState<AuthFrequencySetting>("each");

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
          value={biometricSetting}
          onChange={setBiometricSetting}
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
          value={blurTimeout}
          onChange={setBlurTimeout}
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
          value={authFrequency}
          onChange={setAuthFrequency}
        />
      </FormField>
    </FormScreenLayout>
  );
};
