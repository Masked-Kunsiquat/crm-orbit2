import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../hooks";

type DetailFieldProps = {
  label: string;
  children: ReactNode;
};

/**
 * A reusable component for displaying label/value pairs in detail screens.
 * The label is displayed in uppercase with secondary text color,
 * and the value/children is displayed below it.
 */
export const DetailField = ({ label, children }: DetailFieldProps) => {
  const { colors } = useTheme();

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {label}
      </Text>
      {typeof children === "string" ? (
        <Text style={[styles.value, { color: colors.textPrimary }]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  value: {
    fontSize: 16,
  },
});
