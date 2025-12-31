import { useState, useEffect, useRef } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

import type { AccountsStackScreenProps } from "../../navigation/types";
import { useAccount, useOrganizations } from "../../store/store";
import { useAccountActions } from "../../hooks";
import type {
  Address,
  AccountAddresses,
  SocialMediaLinks,
} from "@domains/account";

const DEVICE_ID = "device-local";

type Props = AccountsStackScreenProps<"AccountForm">;

export const AccountFormScreen = ({ route, navigation }: Props) => {
  const { accountId } = route.params ?? {};
  const account = useAccount(accountId ?? "");
  const allOrganizations = useOrganizations();
  const { createAccount, updateAccount } = useAccountActions(DEVICE_ID);

  // Sort organizations alphabetically by name
  const organizations = [...allOrganizations].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const [name, setName] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [status, setStatus] = useState<
    "account.status.active" | "account.status.inactive"
  >("account.status.active");
  const [siteAddress, setSiteAddress] = useState<Address>({
    street: "",
    city: "",
    state: "",
    zipCode: "",
  });
  const [parkingAddress, setParkingAddress] = useState<Address>({
    street: "",
    city: "",
    state: "",
    zipCode: "",
  });
  const [useSameForParking, setUseSameForParking] = useState(false);
  const [website, setWebsite] = useState("");
  const [socialMedia, setSocialMedia] = useState<SocialMediaLinks>({});
  const [isDirty, setIsDirty] = useState(false);
  const lastAccountIdRef = useRef<string | undefined>(undefined);

  // Only populate form fields on initial mount or when switching to a different account
  useEffect(() => {
    const currentAccountId = accountId ?? undefined;
    const isAccountChanged = currentAccountId !== lastAccountIdRef.current;

    if (isAccountChanged) {
      // Reset dirty flag when switching accounts
      setIsDirty(false);
      lastAccountIdRef.current = currentAccountId;

      if (account) {
        setName(account.name);
        setOrganizationId(account.organizationId);
        setStatus(account.status);
        setSiteAddress(
          account.addresses?.site ?? {
            street: "",
            city: "",
            state: "",
            zipCode: "",
          },
        );
        setParkingAddress(
          account.addresses?.parking ?? {
            street: "",
            city: "",
            state: "",
            zipCode: "",
          },
        );
        setUseSameForParking(account.addresses?.useSameForParking ?? false);
        setWebsite(account.website || "");
        setSocialMedia(account.socialMedia || {});
      } else {
        // New account - reset to defaults
        setName("");
        setOrganizationId(organizations[0]?.id ?? "");
        setStatus("account.status.active");
        setSiteAddress({ street: "", city: "", state: "", zipCode: "" });
        setParkingAddress({ street: "", city: "", state: "", zipCode: "" });
        setUseSameForParking(false);
        setWebsite("");
        setSocialMedia({});
      }
    }
  }, [accountId, account, organizations]);

  const handleNameChange = (value: string) => {
    setName(value);
    setIsDirty(true);
  };

  const handleStatusChange = (
    value: "account.status.active" | "account.status.inactive",
  ) => {
    setStatus(value);
    setIsDirty(true);
  };

  const handleSiteAddressChange = (field: keyof Address, value: string) => {
    setSiteAddress((prev) => ({ ...prev, [field]: value }));
    if (useSameForParking) {
      setParkingAddress((prev) => ({ ...prev, [field]: value }));
    }
    setIsDirty(true);
  };

  const handleParkingAddressChange = (field: keyof Address, value: string) => {
    setParkingAddress((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleUseSameForParkingChange = (value: boolean) => {
    setUseSameForParking(value);
    if (value) {
      setParkingAddress(siteAddress);
    }
    setIsDirty(true);
  };

  const handleSocialMediaChange = (
    platform: keyof SocialMediaLinks,
    value: string,
  ) => {
    setSocialMedia((prev) => ({
      ...prev,
      [platform]: value.trim() || undefined,
    }));
    setIsDirty(true);
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Account name is required");
      return;
    }

    if (!organizationId) {
      Alert.alert("Validation Error", "Organization is required");
      return;
    }

    // Build addresses object
    const hasSiteAddress = Object.values(siteAddress).some(
      (v) => v.trim() !== "",
    );
    const hasParkingAddress = Object.values(parkingAddress).some(
      (v) => v.trim() !== "",
    );
    const addresses: AccountAddresses | undefined =
      hasSiteAddress || hasParkingAddress
        ? {
            site: hasSiteAddress ? siteAddress : undefined,
            parking: hasParkingAddress ? parkingAddress : undefined,
            useSameForParking,
          }
        : undefined;

    // Build social media object
    const socialMediaData: SocialMediaLinks = {
      x: socialMedia.x?.trim() || undefined,
      linkedin: socialMedia.linkedin?.trim() || undefined,
      facebook: socialMedia.facebook?.trim() || undefined,
      instagram: socialMedia.instagram?.trim() || undefined,
    };
    const hasSocialMedia = Object.values(socialMediaData).some((v) => v);

    if (accountId) {
      const result = updateAccount(
        accountId,
        name.trim(),
        status,
        organizationId,
        addresses,
        website.trim() || undefined,
        hasSocialMedia ? socialMediaData : undefined,
      );
      if (result.success) {
        navigation.goBack();
      } else {
        Alert.alert("Error", result.error || "Failed to update account");
      }
    } else {
      const result = createAccount(
        organizationId,
        name.trim(),
        status,
        addresses,
        website.trim() || undefined,
        hasSocialMedia ? socialMediaData : undefined,
      );
      if (result.success) {
        navigation.goBack();
      } else {
        Alert.alert("Error", result.error || "Failed to create account");
      }
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Account Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={handleNameChange}
            placeholder="Enter account name"
            autoFocus
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Organization *</Text>
          {organizations.length === 0 ? (
            <Text style={styles.hint}>
              No organizations available. Create one first.
            </Text>
          ) : (
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={organizationId}
                onValueChange={(value) => {
                  setOrganizationId(value);
                  setIsDirty(true);
                }}
                style={styles.picker}
              >
                {organizations.map((org) => (
                  <Picker.Item key={org.id} label={org.name} value={org.id} />
                ))}
              </Picker>
            </View>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.statusButtons}>
            <TouchableOpacity
              style={[
                styles.statusButton,
                status === "account.status.active" && styles.statusButtonActive,
              ]}
              onPress={() => handleStatusChange("account.status.active")}
            >
              <Text
                style={[
                  styles.statusButtonText,
                  status === "account.status.active" &&
                    styles.statusButtonTextActive,
                ]}
              >
                Active
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.statusButton,
                status === "account.status.inactive" &&
                  styles.statusButtonActive,
              ]}
              onPress={() => handleStatusChange("account.status.inactive")}
            >
              <Text
                style={[
                  styles.statusButtonText,
                  status === "account.status.inactive" &&
                    styles.statusButtonTextActive,
                ]}
              >
                Inactive
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Site Address</Text>
          <TextInput
            style={styles.input}
            value={siteAddress.street}
            onChangeText={(value) => handleSiteAddressChange("street", value)}
            placeholder="Street"
          />
          <TextInput
            style={[styles.input, styles.addressInput]}
            value={siteAddress.city}
            onChangeText={(value) => handleSiteAddressChange("city", value)}
            placeholder="City"
          />
          <View style={styles.addressRow}>
            <TextInput
              style={[styles.input, styles.addressInputSmall]}
              value={siteAddress.state}
              onChangeText={(value) => handleSiteAddressChange("state", value)}
              placeholder="State"
            />
            <TextInput
              style={[styles.input, styles.addressInputSmall]}
              value={siteAddress.zipCode}
              onChangeText={(value) =>
                handleSiteAddressChange("zipCode", value)
              }
              placeholder="ZIP"
            />
          </View>
        </View>

        <View style={styles.field}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => handleUseSameForParkingChange(!useSameForParking)}
          >
            <View
              style={[
                styles.checkbox,
                useSameForParking && styles.checkboxChecked,
              ]}
            >
              {useSameForParking && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              Use same address for parking
            </Text>
          </TouchableOpacity>
        </View>

        {!useSameForParking && (
          <View style={styles.field}>
            <Text style={styles.label}>Parking Address</Text>
            <TextInput
              style={styles.input}
              value={parkingAddress.street}
              onChangeText={(value) =>
                handleParkingAddressChange("street", value)
              }
              placeholder="Street"
            />
            <TextInput
              style={[styles.input, styles.addressInput]}
              value={parkingAddress.city}
              onChangeText={(value) =>
                handleParkingAddressChange("city", value)
              }
              placeholder="City"
            />
            <View style={styles.addressRow}>
              <TextInput
                style={[styles.input, styles.addressInputSmall]}
                value={parkingAddress.state}
                onChangeText={(value) =>
                  handleParkingAddressChange("state", value)
                }
                placeholder="State"
              />
              <TextInput
                style={[styles.input, styles.addressInputSmall]}
                value={parkingAddress.zipCode}
                onChangeText={(value) =>
                  handleParkingAddressChange("zipCode", value)
                }
                placeholder="ZIP"
              />
            </View>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Website</Text>
          <TextInput
            style={styles.input}
            value={website}
            onChangeText={(value) => {
              setWebsite(value);
              setIsDirty(true);
            }}
            placeholder="https://example.com"
            keyboardType="url"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Social Media</Text>
          <TextInput
            style={[styles.input, styles.socialInput]}
            value={socialMedia.x || ""}
            onChangeText={(value) => handleSocialMediaChange("x", value)}
            placeholder="X (Twitter) username or URL"
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, styles.socialInput]}
            value={socialMedia.linkedin || ""}
            onChangeText={(value) => handleSocialMediaChange("linkedin", value)}
            placeholder="LinkedIn URL"
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, styles.socialInput]}
            value={socialMedia.facebook || ""}
            onChangeText={(value) => handleSocialMediaChange("facebook", value)}
            placeholder="Facebook URL"
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, styles.socialInput]}
            value={socialMedia.instagram || ""}
            onChangeText={(value) =>
              handleSocialMediaChange("instagram", value)
            }
            placeholder="Instagram username or URL"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={[
            styles.saveButton,
            organizations.length === 0 && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={organizations.length === 0}
        >
          <Text style={styles.saveButtonText}>
            {accountId ? "Update Account" : "Create Account"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f2ee",
  },
  form: {
    padding: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1b1b1b",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  value: {
    fontSize: 16,
    color: "#1b1b1b",
    paddingVertical: 12,
  },
  hint: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  pickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    overflow: "hidden",
  },
  picker: {
    height: 50,
  },
  statusButtons: {
    flexDirection: "row",
    gap: 12,
  },
  statusButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  statusButtonActive: {
    backgroundColor: "#1f5eff",
    borderColor: "#1f5eff",
  },
  statusButtonText: {
    fontSize: 15,
    color: "#666",
    fontWeight: "500",
  },
  statusButtonTextActive: {
    color: "#fff",
  },
  saveButton: {
    backgroundColor: "#1f5eff",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  saveButtonDisabled: {
    backgroundColor: "#ccc",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
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
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#1f5eff",
    borderColor: "#1f5eff",
  },
  checkmark: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  checkboxLabel: {
    fontSize: 15,
    color: "#1b1b1b",
  },
  socialInput: {
    marginTop: 8,
  },
});
