import { useState, useEffect, useRef } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  Modal,
  Pressable,
} from "react-native";

import { t } from "@i18n/index";
import type { AccountsStackScreenProps } from "../../navigation/types";
import { useAccount, useOrganizations } from "../../store/store";
import { useAccountActions } from "../../hooks";
import type {
  Address,
  AccountAddresses,
  SocialMediaLinks,
} from "@domains/account";
import { useTheme } from "../../hooks/useTheme";
import { AddressFields, SocialMediaFields } from "../../components";

const DEVICE_ID = "device-local";

type Props = AccountsStackScreenProps<"AccountForm">;

export const AccountFormScreen = ({ route, navigation }: Props) => {
  const { accountId } = route.params ?? {};
  const account = useAccount(accountId ?? "");
  const allOrganizations = useOrganizations();
  const { createAccount, updateAccount } = useAccountActions(DEVICE_ID);
  const { colors } = useTheme();

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
  const [isOrganizationPickerOpen, setIsOrganizationPickerOpen] =
    useState(false);
  const lastAccountIdRef = useRef<string | undefined>(undefined);

  // Only populate form fields on initial mount or when switching to a different account
  useEffect(() => {
    const currentAccountId = accountId ?? undefined;
    const isAccountChanged = currentAccountId !== lastAccountIdRef.current;

    if (isAccountChanged) {
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
  };

  const handleStatusChange = (
    value: "account.status.active" | "account.status.inactive",
  ) => {
    setStatus(value);
  };

  const handleSiteAddressChange = (field: keyof Address, value: string) => {
    setSiteAddress((prev) => ({ ...prev, [field]: value }));
    if (useSameForParking) {
      setParkingAddress((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleParkingAddressChange = (field: keyof Address, value: string) => {
    setParkingAddress((prev) => ({ ...prev, [field]: value }));
  };

  const handleUseSameForParkingChange = (value: boolean) => {
    setUseSameForParking(value);
    if (value) {
      setParkingAddress(siteAddress);
    }
  };

  const handleSocialMediaChange = (
    platform: keyof SocialMediaLinks,
    value: string,
  ) => {
    setSocialMedia((prev) => ({
      ...prev,
      [platform]: value.trim() || undefined,
    }));
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", t("accounts.validation.nameRequired"));
      return;
    }

    if (!organizationId) {
      Alert.alert(
        "Validation Error",
        t("accounts.validation.organizationRequired"),
      );
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

  const selectedOrganization = organizations.find(
    (org) => org.id === organizationId,
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.canvas }]}>
      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            Account Name *
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
            value={name}
            onChangeText={handleNameChange}
            placeholder="Enter account name"
            placeholderTextColor={colors.textMuted}
            autoFocus
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            Organization *
          </Text>
          {organizations.length === 0 ? (
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              No organizations available. Create one first.
            </Text>
          ) : (
            <TouchableOpacity
              style={[
                styles.pickerButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setIsOrganizationPickerOpen(true)}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.pickerButtonText,
                  { color: colors.textSecondary },
                ]}
              >
                {selectedOrganization?.name ?? "Select organization"}
              </Text>
              <Text style={[styles.pickerChevron, { color: colors.chevron }]}>
                ▼
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            Status
          </Text>
          <View style={styles.statusButtons}>
            <TouchableOpacity
              style={[
                styles.statusButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
                status === "account.status.active" && {
                  backgroundColor: colors.accent,
                  borderColor: colors.accent,
                },
              ]}
              onPress={() => handleStatusChange("account.status.active")}
            >
              <Text
                style={[
                  styles.statusButtonText,
                  { color: colors.textSecondary },
                  status === "account.status.active" && {
                    color: colors.surface,
                  },
                ]}
              >
                Active
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.statusButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
                status === "account.status.inactive" && {
                  backgroundColor: colors.accent,
                  borderColor: colors.accent,
                },
              ]}
              onPress={() => handleStatusChange("account.status.inactive")}
            >
              <Text
                style={[
                  styles.statusButtonText,
                  { color: colors.textSecondary },
                  status === "account.status.inactive" && {
                    color: colors.surface,
                  },
                ]}
              >
                Inactive
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <AddressFields
          label="Site Address"
          address={siteAddress}
          onChange={handleSiteAddressChange}
        />

        <View style={styles.field}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => handleUseSameForParkingChange(!useSameForParking)}
          >
            <View
              style={[
                styles.checkbox,
                { backgroundColor: colors.surface, borderColor: colors.border },
                useSameForParking && {
                  backgroundColor: colors.accent,
                  borderColor: colors.accent,
                },
              ]}
            >
              {useSameForParking && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.checkboxLabel, { color: colors.textPrimary }]}>
              Use same address for parking
            </Text>
          </TouchableOpacity>
        </View>

        {!useSameForParking && (
          <AddressFields
            label="Parking Address"
            address={parkingAddress}
            onChange={handleParkingAddressChange}
          />
        )}

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            Website
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
            value={website}
            onChangeText={(value) => {
              setWebsite(value);
            }}
            placeholder="https://example.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="url"
            autoCapitalize="none"
          />
        </View>

        <SocialMediaFields
          socialMedia={socialMedia}
          onChange={handleSocialMediaChange}
          translationPrefix="accounts"
        />

        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: colors.accent },
            organizations.length === 0 && { backgroundColor: colors.textMuted },
          ]}
          onPress={handleSave}
          disabled={organizations.length === 0}
        >
          <Text style={[styles.saveButtonText, { color: colors.surface }]}>
            {accountId ? "Update Account" : "Create Account"}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        transparent
        animationType="fade"
        visible={isOrganizationPickerOpen}
        onRequestClose={() => setIsOrganizationPickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIsOrganizationPickerOpen(false)}
          />
          <View
            style={[
              styles.pickerModal,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Select organization
            </Text>
            <ScrollView style={styles.pickerList}>
              {organizations.map((org) => {
                const isSelected = org.id === organizationId;
                return (
                  <TouchableOpacity
                    key={org.id}
                    style={[
                      styles.pickerItem,
                      { borderBottomColor: colors.borderLight },
                      isSelected && { backgroundColor: colors.surfaceElevated },
                    ]}
                    onPress={() => {
                      setOrganizationId(org.id);
                      setIsOrganizationPickerOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        { color: colors.textPrimary },
                        isSelected && { color: colors.accent },
                      ]}
                    >
                      {org.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 8,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  value: {
    fontSize: 16,
    paddingVertical: 12,
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
  pickerButton: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerButtonText: {
    fontSize: 16,
  },
  pickerChevron: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  pickerModal: {
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: "70%",
    overflow: "hidden",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  pickerList: {
    flexGrow: 0,
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  pickerItemText: {
    fontSize: 16,
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
    alignItems: "center",
  },
  statusButtonText: {
    fontSize: 15,
    fontWeight: "500",
  },
  saveButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
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
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  checkboxLabel: {
    fontSize: 15,
  },
});
