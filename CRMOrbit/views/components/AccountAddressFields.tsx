import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Account } from "@domains/account";
import { useTheme } from "../hooks/useTheme";
import { DetailField } from "./DetailField";
import {
  openMapsWithAddress,
  formatAddressForMaps,
} from "@domains/linking.utils";

export interface AccountAddressFieldsProps {
  account: Account;
  labels: {
    siteAddress: string;
    parkingAddress: string;
    sameAsSiteAddress: string;
  };
}

/**
 * Renders address fields for an account (site address, parking address).
 * Extracted from AccountDetailScreen to reduce file size.
 */
export const AccountAddressFields = ({
  account,
  labels,
}: AccountAddressFieldsProps) => {
  const { colors } = useTheme();

  return (
    <>
      {account.addresses?.site && (
        <DetailField label={labels.siteAddress}>
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
        <DetailField label={labels.parkingAddress}>
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
        <DetailField label={labels.parkingAddress}>
          {labels.sameAsSiteAddress}
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
