import { StyleSheet, View } from "react-native";

import { t } from "@i18n/index";
import type { Address } from "@domains/account";
import { FormField } from "./FormField";
import { TextField } from "./TextField";

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
  return (
    <FormField label={t(labelKey)}>
      <TextField
        value={address.street}
        onChangeText={(value) => onChange("street", value)}
        placeholder={t("common.address.street")}
      />
      <TextField
        style={styles.addressInput}
        value={address.city}
        onChangeText={(value) => onChange("city", value)}
        placeholder={t("common.address.city")}
      />
      <View style={styles.addressRow}>
        <TextField
          style={styles.addressInputSmall}
          value={address.state}
          onChangeText={(value) => onChange("state", value)}
          placeholder={t("common.address.state")}
        />
        <TextField
          style={styles.addressInputSmall}
          value={address.zipCode}
          onChangeText={(value) => onChange("zipCode", value)}
          placeholder={t("common.address.zip")}
        />
      </View>
    </FormField>
  );
};

const styles = StyleSheet.create({
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
