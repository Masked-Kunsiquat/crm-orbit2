import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../hooks";

type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedOptionGroupProps<T extends string> = {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  layout?: "row" | "wrap";
  maxLabelLines?: number;
};

export const SegmentedOptionGroup = <T extends string>({
  options,
  value,
  onChange,
  layout = "row",
  maxLabelLines,
}: SegmentedOptionGroupProps<T>) => {
  const { colors } = useTheme();
  const isWrap = layout === "wrap";
  const labelLines = maxLabelLines ?? (isWrap ? 2 : 1);

  return (
    <View style={[styles.container, isWrap ? styles.containerWrap : null]}>
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.option,
              !isWrap ? styles.optionFill : styles.optionWrap,
              { backgroundColor: colors.surface, borderColor: colors.border },
              isSelected && {
                backgroundColor: colors.accent,
                borderColor: colors.accent,
              },
              pressed && !isSelected ? styles.optionPressed : null,
            ]}
          >
            <Text
              style={[
                styles.optionText,
                { color: colors.textSecondary },
                isSelected && { color: colors.onAccent },
              ]}
              numberOfLines={labelLines}
              ellipsizeMode="tail"
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 6,
  },
  containerWrap: {
    flexWrap: "wrap",
  },
  option: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
  },
  optionFill: {
    flex: 1,
  },
  optionWrap: {
    flexBasis: "48%",
    flexGrow: 1,
  },
  optionPressed: {
    opacity: 0.85,
  },
  optionText: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
});
