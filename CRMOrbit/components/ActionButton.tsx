import { Pressable, StyleSheet, Text } from "react-native";

import { colors } from "../theme/colors";

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export const ActionButton = ({
  label,
  onPress,
  disabled,
}: ActionButtonProps) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    style={({ pressed }) => [
      styles.button,
      disabled ? styles.buttonDisabled : null,
      pressed && !disabled ? styles.buttonPressed : null,
    ]}
    disabled={disabled}
  >
    <Text style={styles.buttonLabel}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    backgroundColor: colors.accentMuted,
  },
  buttonLabel: {
    color: colors.surface,
    fontWeight: "600",
  },
});
