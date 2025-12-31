import { StyleSheet, Text, View } from "react-native";

import { colors } from "../../domains/shared/theme/colors";

type StatusBadgeProps = {
  isActive: boolean;
  activeLabel: string;
  inactiveLabel: string;
};

export const StatusBadge = ({
  isActive,
  activeLabel,
  inactiveLabel,
}: StatusBadgeProps) => (
  <View style={[styles.badge, isActive ? styles.active : styles.inactive]}>
    <Text style={styles.text}>{isActive ? activeLabel : inactiveLabel}</Text>
  </View>
);

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  active: {
    backgroundColor: colors.statusActiveBg,
  },
  inactive: {
    backgroundColor: colors.statusInactiveBg,
  },
  text: {
    fontSize: 12,
    fontWeight: "500",
  },
});
