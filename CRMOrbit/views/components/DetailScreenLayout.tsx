import type { ReactNode } from "react";
import { ScrollView, StyleSheet } from "react-native";

import { useTheme } from "../hooks";

type DetailScreenLayoutProps = {
  children: ReactNode;
};

/**
 * Layout wrapper for detail screens that provides consistent background styling.
 */
export const DetailScreenLayout = ({ children }: DetailScreenLayoutProps) => {
  const { colors } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.canvas }]}>
      {children}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
