import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "../hooks";

type FormScreenLayoutProps = {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
};

export const FormScreenLayout = ({
  children,
  contentStyle,
}: FormScreenLayoutProps) => {
  const { colors } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.canvas }]}>
      <View style={[styles.form, contentStyle]}>{children}</View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
});
