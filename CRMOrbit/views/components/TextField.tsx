import { StyleSheet, TextInput, type TextInputProps } from "react-native";

import { useTheme } from "../hooks";

type TextFieldProps = TextInputProps;

export const TextField = ({
  style,
  placeholderTextColor,
  ...props
}: TextFieldProps) => {
  const { colors } = useTheme();

  return (
    <TextInput
      {...props}
      style={[
        styles.input,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          color: colors.textPrimary,
        },
        style,
      ]}
      placeholderTextColor={placeholderTextColor ?? colors.textMuted}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
  },
});
