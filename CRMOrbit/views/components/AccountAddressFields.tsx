import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Account } from "@domains/account";
import { t } from "@i18n/index";
import { useTheme } from "../hooks/useTheme";
import { DetailField } from "./DetailField";
import {
  openMapsWithAddress,
  formatAddressForMaps,
} from "@domains/linking.utils";

export interface AccountAddressFieldsProps {
  account: Account;
}

/**
 * Renders address fields for an account (site address, parking address).
 * Extracted from AccountDetailScreen to reduce file size.
 */
export const AccountAddressFields = ({
  account,
}: AccountAddressFieldsProps) => {
  const { colors } = useTheme();

  return (
    <>
      {account.addresses?.site && (
        <DetailField label={t("accounts.fields.siteAddress")}>
          <View style={styles.addressContainer}>
            <View style={styles.addressText}>
              <Text style={{ color: colors.textPrimary, fontSize: 16 }}>
                {account.addresses.site.street}
              </Text>
              <Text style={{ color: colors.textPrimary, fontSize: 16 }}>
                {account.addresses.site.city}, {account.addresses.site.state}{" "}
                {account.addresses.site.zipCode}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() =>
                void openMapsWithAddress(
                  formatAddressForMaps(account.addresses!.site!),
                )
              }
              style={styles.mapIconButton}
            >
              <Ionicons
                name="location-outline"
                size={24}
                color={colors.accent}
              />
            </TouchableOpacity>
          </View>
        </DetailField>
      )}

      {account.addresses?.parking && !account.addresses.useSameForParking && (
        <DetailField label={t("accounts.fields.parkingAddress")}>
          <View style={styles.addressContainer}>
            <View style={styles.addressText}>
              <Text style={{ color: colors.textPrimary, fontSize: 16 }}>
                {account.addresses.parking.street}
              </Text>
              <Text style={{ color: colors.textPrimary, fontSize: 16 }}>
                {account.addresses.parking.city},{" "}
                {account.addresses.parking.state}{" "}
                {account.addresses.parking.zipCode}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() =>
                void openMapsWithAddress(
                  formatAddressForMaps(account.addresses!.parking!),
                )
              }
              style={styles.mapIconButton}
            >
              <Ionicons
                name="location-outline"
                size={24}
                color={colors.accent}
              />
            </TouchableOpacity>
          </View>
        </DetailField>
      )}

      {account.addresses?.useSameForParking && (
        <DetailField label={t("accounts.fields.parkingAddress")}>
          {t("accounts.sameAsSiteAddress")}
        </DetailField>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  addressContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  addressText: {
    flex: 1,
  },
  mapIconButton: {
    padding: 4,
    marginLeft: 8,
  },
});
