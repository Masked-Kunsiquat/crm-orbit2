import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../hooks";

type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedOptionGroupProps<T extends string> = {
  options: Array<SegmentedOption<T>>;
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
                isSelected && { color: colors.surface },
              ]}
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
    gap: 8,
  },
  option: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  optionPressed: {
    opacity: 0.85,
  },
  optionText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
