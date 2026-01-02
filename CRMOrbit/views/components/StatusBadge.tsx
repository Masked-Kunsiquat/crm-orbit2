import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../hooks";
import { t } from "@i18n/index";

type StatusBadgeProps = {
  isActive: boolean;
  activeLabelKey: string;
  inactiveLabelKey: string;
};

export const StatusBadge = ({
  isActive,
  activeLabelKey,
  inactiveLabelKey,
}: StatusBadgeProps) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: isActive
            ? colors.statusActiveBg
            : colors.statusInactiveBg,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: isActive ? colors.success : colors.error },
        ]}
      >
        {isActive ? t(activeLabelKey) : t(inactiveLabelKey)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: "500",
  },
});
