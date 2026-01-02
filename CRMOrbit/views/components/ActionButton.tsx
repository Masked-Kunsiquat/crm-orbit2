import { Pressable, StyleSheet, Text } from "react-native";

import { useTheme } from "../hooks";

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export const ActionButton = ({
  label,
  onPress,
  disabled,
}: ActionButtonProps) => {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: disabled ? colors.accentMuted : colors.accent,
        },
        pressed && !disabled ? styles.buttonPressed : null,
      ]}
      disabled={disabled}
    >
      <Text style={[styles.buttonLabel, { color: colors.surface }]}>
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonLabel: {
    fontWeight: "600",
  },
});
