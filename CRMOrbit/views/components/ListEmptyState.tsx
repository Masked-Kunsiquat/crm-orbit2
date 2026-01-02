import type { ViewStyle } from "react-native";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../hooks";

type ListEmptyStateProps = {
  title: string;
  hint?: string;
  style?: ViewStyle;
};

export const ListEmptyState = ({ title, hint, style }: ListEmptyStateProps) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.title, { color: colors.textMuted }]}>{title}</Text>
      {hint ? (
        <Text style={[styles.hint, { color: colors.textFaint }]}>{hint}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  title: {
    fontSize: 16,
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    textAlign: "center",
  },
});
