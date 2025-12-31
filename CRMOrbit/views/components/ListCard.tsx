import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, StyleSheet, Text } from "react-native";

import { colors } from "../../domains/shared/theme/colors";

type ListCardProps = {
  children: ReactNode;
  onPress: () => void;
  variant?: "elevated" | "outlined";
  style?: StyleProp<ViewStyle>;
};

export const ListCard = ({
  children,
  onPress,
  variant = "elevated",
  style,
}: ListCardProps) => (
  <Pressable
    onPress={onPress}
    style={[styles.base, variant === "elevated" ? styles.elevated : styles.outlined, style]}
  >
    {children}
  </Pressable>
);

export const ListCardChevron = () => (
  <Text style={styles.chevron}>›</Text>
);

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  elevated: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  outlined: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  chevron: {
    fontSize: 24,
    color: colors.chevron,
    marginLeft: 12,
  },
});
