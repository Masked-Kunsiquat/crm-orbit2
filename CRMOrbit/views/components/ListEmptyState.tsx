import type { ViewStyle } from "react-native";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../../domains/shared/theme/colors";

type ListEmptyStateProps = {
  title: string;
  hint?: string;
  style?: ViewStyle;
};

export const ListEmptyState = ({ title, hint, style }: ListEmptyStateProps) => (
  <View style={[styles.container, style]}>
    <Text style={styles.title}>{title}</Text>
    {hint ? <Text style={styles.hint}>{hint}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  title: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: colors.textFaint,
    textAlign: "center",
  },
});
