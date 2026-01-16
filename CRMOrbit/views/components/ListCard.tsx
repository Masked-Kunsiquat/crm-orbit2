import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, StyleSheet, Text } from "react-native";

import { useTheme } from "../hooks";

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
}: ListCardProps) => {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.base,
        { backgroundColor: colors.surface },
        variant === "elevated"
          ? [styles.elevated, { shadowColor: colors.shadow }]
          : [styles.outlined, { borderColor: colors.border }],
        style,
      ]}
    >
      {children}
    </Pressable>
  );
};

export const ListCardChevron = () => {
  const { colors } = useTheme();

  return <Text style={[styles.chevron, { color: colors.chevron }]}>›</Text>;
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  elevated: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  outlined: {
    borderWidth: 1,
  },
  chevron: {
    fontSize: 24,
    marginLeft: 12,
  },
});
