import { StyleSheet, Text, TextInput, View } from "react-native";

import { t } from "@i18n/index";
import type { Address } from "@domains/account";
import { useTheme } from "../hooks";

type AddressFieldsProps = {
  labelKey: string;
  address: Address;
  onChange: (field: keyof Address, value: string) => void;
};

export const AddressFields = ({
  labelKey,
  address,
  onChange,
}: AddressFieldsProps) => {
  const { colors } = useTheme();

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>
        {t(labelKey)}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.textPrimary,
          },
        ]}
        value={address.street}
        onChangeText={(value) => onChange("street", value)}
        placeholder={t("common.address.street")}
        placeholderTextColor={colors.textMuted}
      />
      <TextInput
        style={[
          styles.input,
          styles.addressInput,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.textPrimary,
          },
        ]}
        value={address.city}
        onChangeText={(value) => onChange("city", value)}
        placeholder={t("common.address.city")}
        placeholderTextColor={colors.textMuted}
      />
      <View style={styles.addressRow}>
        <TextInput
          style={[
            styles.input,
            styles.addressInputSmall,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.textPrimary,
            },
          ]}
          value={address.state}
          onChangeText={(value) => onChange("state", value)}
          placeholder={t("common.address.state")}
          placeholderTextColor={colors.textMuted}
        />
        <TextInput
          style={[
            styles.input,
            styles.addressInputSmall,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.textPrimary,
            },
          ]}
          value={address.zipCode}
          onChangeText={(value) => onChange("zipCode", value)}
          placeholder={t("common.address.zip")}
          placeholderTextColor={colors.textMuted}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  addressInput: {
    marginTop: 8,
  },
  addressRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  addressInputSmall: {
    flex: 1,
  },
});
