import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../hooks";
import { ListCard, ListCardChevron } from "./ListCard";

type ListRowProps = {
  title: string;
  onPress: () => void;
  variant?: "elevated" | "outlined";
  showChevron?: boolean;
  titleAccessory?: ReactNode;
  children?: ReactNode;
  subtitle?: string;
  subtitleItalic?: boolean;
  titleSpacing?: number;
  description?: string;
  descriptionNumberOfLines?: number;
  footnote?: string;
  footnoteNumberOfLines?: number;
  style?: StyleProp<ViewStyle>;
};

export const ListRow = ({
  title,
  onPress,
  variant = "elevated",
  showChevron = false,
  titleAccessory,
  children,
  subtitle,
  subtitleItalic = false,
  titleSpacing,
  description,
  descriptionNumberOfLines,
  footnote,
  footnoteNumberOfLines,
  style,
}: ListRowProps) => {
  const { colors } = useTheme();
  const hasSubtitle = Boolean(subtitle);
  const hasDescription = Boolean(description);
  const hasFootnote = Boolean(footnote);
  const resolvedTitleSpacing = titleSpacing ?? 4;

  return (
    <ListCard onPress={onPress} variant={variant} style={style}>
      <View style={styles.row}>
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.title,
                { color: colors.textPrimary },
                (hasSubtitle || hasDescription || hasFootnote) && {
                  marginBottom: resolvedTitleSpacing,
                },
              ]}
            >
              {title}
            </Text>
            {titleAccessory ? (
              <View style={styles.titleAccessory}>{titleAccessory}</View>
            ) : null}
          </View>
          {subtitle ? (
            <Text
              style={[
                styles.subtitle,
                { color: colors.textSecondary },
                subtitleItalic && styles.subtitleItalic,
                (hasDescription || hasFootnote) && styles.subtitleSpacing,
              ]}
            >
              {subtitle}
            </Text>
          ) : null}
          {description ? (
            <Text
              style={[
                styles.description,
                { color: colors.textSecondary },
                hasFootnote && styles.descriptionSpacing,
              ]}
              numberOfLines={descriptionNumberOfLines}
            >
              {description}
            </Text>
          ) : null}
        {footnote ? (
          <Text
            style={[styles.footnote, { color: colors.textMuted }]}
            numberOfLines={footnoteNumberOfLines}
          >
            {footnote}
          </Text>
        ) : null}
      </View>
      {children || showChevron ? (
        <View style={styles.trailing}>
          {children}
          {showChevron ? <ListCardChevron /> : null}
        </View>
      ) : null}
    </View>
  </ListCard>
);
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  titleAccessory: {
    marginLeft: 8,
  },
  trailing: {
    flexDirection: "row",
    alignItems: "center",
  },
  subtitle: {
    fontSize: 13,
  },
  subtitleItalic: {
    fontStyle: "italic",
  },
  subtitleSpacing: {
    marginBottom: 2,
  },
  description: {
    fontSize: 14,
  },
  descriptionSpacing: {
    marginBottom: 2,
  },
  footnote: {
    fontSize: 12,
  },
});
