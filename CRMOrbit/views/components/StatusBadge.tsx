import { StyleSheet, Text, View } from "react-native";

import { colors } from "../../domains/shared/theme/colors";
import { t } from "../../i18n";

type StatusBadgeProps = {
  isActive: boolean;
  activeLabelKey: string;
  inactiveLabelKey: string;
};

export const StatusBadge = ({
  isActive,
  activeLabelKey,
  inactiveLabelKey,
}: StatusBadgeProps) => (
  <View style={[styles.badge, isActive ? styles.active : styles.inactive]}>
    <Text style={styles.text}>{isActive ? t(activeLabelKey) : t(inactiveLabelKey)}</Text>
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
