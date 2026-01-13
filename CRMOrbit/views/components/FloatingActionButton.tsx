import { Pressable, StyleSheet, Text } from "react-native";

import { useTheme } from "../hooks";

type FloatingActionButtonProps = {
  label?: string;
  onPress: () => void;
  color?: string;
  accessibilityLabel?: string;
};

export const FloatingActionButton = ({
  label = "+",
  onPress,
  color,
  accessibilityLabel,
}: FloatingActionButtonProps) => {
  const { colors } = useTheme();
  const buttonColor = color ?? colors.accent;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={[styles.fab, { backgroundColor: buttonColor }]}
    >
      <Text style={[styles.fabText, { color: colors.onAccent }]}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: {
    fontSize: 32,
    fontWeight: "300",
  },
});
