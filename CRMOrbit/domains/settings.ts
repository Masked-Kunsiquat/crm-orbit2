export type SecurityBiometricSetting = "enabled" | "disabled";
export type SecurityBlurTimeout = "15" | "30" | "60" | "never";
export type SecurityAuthFrequency = "each" | "session";

export type SecuritySettings = {
  biometricAuth: SecurityBiometricSetting;
  blurTimeout: SecurityBlurTimeout;
  authFrequency: SecurityAuthFrequency;
};

export type Settings = {
  security: SecuritySettings;
};

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  biometricAuth: "enabled",
  blurTimeout: "30",
  authFrequency: "each",
};

export const DEFAULT_SETTINGS: Settings = {
  security: DEFAULT_SECURITY_SETTINGS,
};

const BIOMETRIC_VALUES = new Set<SecurityBiometricSetting>([
  "enabled",
  "disabled",
]);
const BLUR_TIMEOUT_VALUES = new Set<SecurityBlurTimeout>([
  "15",
  "30",
  "60",
  "never",
]);
const AUTH_FREQUENCY_VALUES = new Set<SecurityAuthFrequency>([
  "each",
  "session",
]);

export const isSecurityBiometricSetting = (
  value: unknown,
): value is SecurityBiometricSetting =>
  typeof value === "string" &&
  BIOMETRIC_VALUES.has(value as SecurityBiometricSetting);

export const isSecurityBlurTimeout = (
  value: unknown,
): value is SecurityBlurTimeout =>
  typeof value === "string" &&
  BLUR_TIMEOUT_VALUES.has(value as SecurityBlurTimeout);

export const isSecurityAuthFrequency = (
  value: unknown,
): value is SecurityAuthFrequency =>
  typeof value === "string" &&
  AUTH_FREQUENCY_VALUES.has(value as SecurityAuthFrequency);
