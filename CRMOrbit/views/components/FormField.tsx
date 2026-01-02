import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../hooks";

type FormFieldProps = {
  label?: string;
  hint?: string;
  accessory?: ReactNode;
  children: ReactNode;
};

export const FormField = ({
  label,
  hint,
  accessory,
  children,
}: FormFieldProps) => {
  const { colors } = useTheme();

  return (
    <View style={styles.field}>
      {(label || accessory) && (
        <View style={styles.header}>
          {label ? (
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              {label}
            </Text>
          ) : null}
          {accessory}
        </View>
      )}
      {children}
      {hint ? (
        <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  field: {
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
});
