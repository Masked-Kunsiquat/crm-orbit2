export type ColorScheme = {
  // Backgrounds
  canvas: string;
  surface: string;
  surfaceElevated: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textFaint: string;

  // Accent/Primary
  accent: string;
  accentMuted: string;
  onAccent: string;
  onError: string;

  // Borders
  border: string;
  borderLight: string;

  // Semantic colors
  success: string;
  successBg: string;
  error: string;
  errorBg: string;
  link: string;

  // UI elements
  chevron: string;
  statusActiveBg: string;
  statusInactiveBg: string;
  headerBackground: string;
  headerTint: string;

  // Contact type badges
  contactTypeInternalBg: string;
  contactTypeInternalText: string;
  contactTypeExternalBg: string;
  contactTypeExternalText: string;
  contactTypeVendorBg: string;
  contactTypeVendorText: string;
};

export const lightColors: ColorScheme = {
  // Backgrounds
  canvas: "#f4f2ee",
  surface: "#ffffff",
  surfaceElevated: "#f9f9f9",

  // Text
  textPrimary: "#1b1b1b",
  textSecondary: "#666666",
  textMuted: "#999999",
  textFaint: "#bbbbbb",

  // Accent/Primary
  accent: "#1f5eff",
  accentMuted: "#9aa7cf",
  onAccent: "#ffffff",
  onError: "#ffffff",

  // Borders
  border: "#e0e0e0",
  borderLight: "#f0f0f0",

  // Semantic colors
  success: "#4caf50",
  successBg: "#e8f5e9",
  error: "#b00020",
  errorBg: "#ffebee",
  link: "#1f5eff",

  // UI elements
  chevron: "#cccccc",
  statusActiveBg: "#e8f5e9",
  statusInactiveBg: "#ffebee",
  headerBackground: "#f4f2ee",
  headerTint: "#1b1b1b",

  // Contact type badges
  contactTypeInternalBg: "#e3f2fd",
  contactTypeInternalText: "#1565c0",
  contactTypeExternalBg: "#fff3e0",
  contactTypeExternalText: "#e65100",
  contactTypeVendorBg: "#f3e5f5",
  contactTypeVendorText: "#6a1b9a",
};

export const darkColors: ColorScheme = {
  // Backgrounds
  canvas: "#1a1a1a",
  surface: "#242424",
  surfaceElevated: "#2e2e2e",

  // Text
  textPrimary: "#e8e6e3",
  textSecondary: "#b0b0b0",
  textMuted: "#808080",
  textFaint: "#5a5a5a",

  // Accent/Primary
  accent: "#4d7dff",
  accentMuted: "#6b8bc3",
  onAccent: "#ffffff",
  onError: "#ffffff",

  // Borders
  border: "#3a3a3a",
  borderLight: "#404040",

  // Semantic colors
  success: "#4ade80",
  successBg: "#1e3a1e",
  error: "#f87171",
  errorBg: "#3a1e1e",
  link: "#4d7dff",

  // UI elements
  chevron: "#5a5a5a",
  statusActiveBg: "#1e3a1e",
  statusInactiveBg: "#3a1e1e",
  headerBackground: "#1a1a1a",
  headerTint: "#e8e6e3",

  // Contact type badges
  contactTypeInternalBg: "#1a2a3a",
  contactTypeInternalText: "#5ba3ff",
  contactTypeExternalBg: "#3a2a1a",
  contactTypeExternalText: "#ffb74d",
  contactTypeVendorBg: "#2a1a3a",
  contactTypeVendorText: "#ba68c8",
};

// Default export for backward compatibility
export const colors = lightColors;
