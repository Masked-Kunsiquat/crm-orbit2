import { Pressable, StyleSheet, Text } from "react-native";

import { useTheme } from "../hooks";

type ActionButtonVariant = "primary" | "danger";
type ActionButtonSize = "inline" | "compact" | "block";
type ActionButtonTone = "solid" | "link";

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: ActionButtonVariant;
  size?: ActionButtonSize;
  tone?: ActionButtonTone;
  stacked?: boolean;
};

export const ActionButton = ({
  label,
  onPress,
  disabled,
  variant = "primary",
  size = "inline",
  tone = "solid",
  stacked = false,
}: ActionButtonProps) => {
  const { colors } = useTheme();

  const variantBackground = variant === "danger" ? colors.error : colors.accent;
  const variantLink = variant === "danger" ? colors.error : colors.link;
  const disabledBackground =
    variant === "danger" ? colors.errorBg : colors.accentMuted;

  const backgroundColor =
    tone === "link"
      ? "transparent"
      : disabled
        ? disabledBackground
        : variantBackground;
  const textColor =
    tone === "link"
      ? disabled
        ? colors.textMuted
        : variantLink
      : colors.surface;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.buttonBase,
        size === "inline" && styles.inlineButton,
        size === "compact" && styles.compactButton,
        size === "block" && styles.blockButton,
        stacked && size === "block" && styles.blockButtonStacked,
        tone === "link" && styles.linkButton,
        { backgroundColor },
        pressed && !disabled ? styles.buttonPressed : null,
      ]}
      disabled={disabled}
    >
      <Text style={[styles.buttonLabel, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
};

export const PrimaryActionButton = (
  props: Omit<ActionButtonProps, "variant">,
) => <ActionButton {...props} variant="primary" />;

export const DangerActionButton = (
  props: Omit<ActionButtonProps, "variant">,
) => <ActionButton {...props} variant="danger" />;

const styles = StyleSheet.create({
  buttonBase: {
    alignItems: "center",
  },
  inlineButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  compactButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  blockButton: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    alignSelf: "stretch",
  },
  blockButtonStacked: {
    marginTop: 0,
  },
  linkButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonLabel: {
    fontWeight: "600",
  },
});
