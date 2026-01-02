import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { TextInputProps } from "react-native";

import type { ContactMethod, ContactMethodLabel } from "@domains/contact";
import { useTheme } from "../hooks";
import { FormField } from "./FormField";
import { SegmentedOptionGroup } from "./SegmentedOptionGroup";
import { TextField } from "./TextField";

type MethodListEditorProps = {
  label: string;
  methods: ContactMethod[];
  onAdd: () => void;
  onChange: (index: number, value: string) => void;
  onLabelChange?: (index: number, label: ContactMethodLabel) => void;
  onRemove: (index: number) => void;
  placeholder: string;
  addLabel: string;
  labelOptions?: ReadonlyArray<{ value: ContactMethodLabel; label: string }>;
  removeLabel?: string;
  keyboardType?: TextInputProps["keyboardType"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
};

export const MethodListEditor = ({
  label,
  methods,
  onAdd,
  onChange,
  onLabelChange,
  onRemove,
  placeholder,
  addLabel,
  labelOptions,
  removeLabel = "x",
  keyboardType,
  autoCapitalize,
}: MethodListEditorProps) => {
  const { colors } = useTheme();
  const showLabelEditor = Boolean(labelOptions && onLabelChange);

  return (
    <FormField
      label={label}
      accessory={
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.accent }]}
          onPress={onAdd}
        >
          <Text style={[styles.addButtonText, { color: colors.onAccent }]}>
            {addLabel}
          </Text>
        </TouchableOpacity>
      }
    >
      {methods.map((method, index) => (
        <View key={method.id} style={styles.methodItem}>
          {showLabelEditor && labelOptions ? (
            <SegmentedOptionGroup
              options={labelOptions}
              value={method.label}
              onChange={(label) => onLabelChange?.(index, label)}
            />
          ) : null}
          <View
            style={[
              styles.methodRow,
              !showLabelEditor && styles.methodRowTight,
            ]}
          >
            <TextField
              style={styles.methodInput}
              value={method.value}
              onChangeText={(value) => onChange(index, value)}
              placeholder={placeholder}
              keyboardType={keyboardType}
              autoCapitalize={autoCapitalize}
            />
            <TouchableOpacity
              style={[styles.removeButton, { backgroundColor: colors.errorBg }]}
              onPress={() => onRemove(index)}
            >
              <Text style={[styles.removeButtonText, { color: colors.error }]}>
                {removeLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </FormField>
  );
};

const styles = StyleSheet.create({
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  methodItem: {
    marginBottom: 12,
  },
  methodRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  methodRowTight: {
    marginTop: 0,
  },
  methodInput: {
    flex: 1,
  },
  removeButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  removeButtonText: {
    fontSize: 24,
    fontWeight: "300",
  },
});
