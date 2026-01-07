import { useCallback } from "react";
import { StyleSheet, TextInput, type TextInputProps } from "react-native";

import { useTheme } from "../hooks";
import { useFormScrollContext } from "./FormScrollContext";

type TextFieldProps = TextInputProps;

export const TextField = ({
  style,
  placeholderTextColor,
  onFocus,
  ...props
}: TextFieldProps) => {
  const { colors } = useTheme();
  const formScroll = useFormScrollContext();
  const handleFocus = useCallback(
    (event: Parameters<NonNullable<TextInputProps["onFocus"]>>[0]) => {
      const target = event.nativeEvent?.target;
      if (formScroll && typeof target === "number") {
        formScroll.scrollToInput(target);
      }
      onFocus?.(event);
    },
    [formScroll, onFocus],
  );

  return (
    <TextInput
      {...props}
      onFocus={handleFocus}
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
