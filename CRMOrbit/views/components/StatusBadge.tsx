import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../hooks";
import { t } from "@i18n/index";

type StatusTone = "success" | "warning" | "danger";

type StatusBadgeProps =
  | {
      tone: StatusTone;
      labelKey: string;
    }
  | {
      isActive: boolean;
      activeLabelKey: string;
      inactiveLabelKey: string;
    };

export const StatusBadge = (props: StatusBadgeProps) => {
  const { colors } = useTheme();

  const resolveTone = () => {
    if ("tone" in props) {
      return props.tone;
    }
    return props.isActive ? "success" : "danger";
  };

  const tone = resolveTone();
  const backgroundColor =
    tone === "success"
      ? colors.successBg
      : tone === "warning"
        ? colors.warningBg
        : colors.errorBg;
  const textColor =
    tone === "success"
      ? colors.success
      : tone === "warning"
        ? colors.warning
        : colors.error;

  const label =
    "labelKey" in props
      ? t(props.labelKey)
      : props.isActive
        ? t(props.activeLabelKey)
        : t(props.inactiveLabelKey);

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor,
        },
      ]}
    >
      <Text style={[styles.text, { color: textColor }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
  },
});
