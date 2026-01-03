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
};

export const SegmentedOptionGroup = <T extends string>({
  options,
  value,
  onChange,
}: SegmentedOptionGroupProps<T>) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.option,
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
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
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
  option: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
  },
  optionPressed: {
    opacity: 0.85,
  },
  optionText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
