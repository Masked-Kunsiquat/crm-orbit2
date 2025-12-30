import { Pressable, StyleSheet, Text } from "react-native";

import { colors } from "../theme/colors";

type FloatingActionButtonProps = {
  label?: string;
  onPress: () => void;
  color?: string;
};

export const FloatingActionButton = ({
  label = "+",
  onPress,
  color = colors.accent,
}: FloatingActionButtonProps) => (
  <Pressable onPress={onPress} style={[styles.fab, { backgroundColor: color }]}>
    <Text style={styles.fabText}>{label}</Text>
  </Pressable>
);

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
    color: colors.surface,
    fontWeight: "300",
  },
});
