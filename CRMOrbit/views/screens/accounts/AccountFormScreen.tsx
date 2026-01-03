import { useState, useEffect, useRef } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  Pressable,
} from "react-native";

import { t } from "@i18n/index";
import type { AccountsStackScreenProps } from "../../navigation/types";
import { useAccount, useOrganizations } from "../../store/store";
import { useAccountActions, useDeviceId } from "../../hooks";
import type {
  Address,
  AccountAddresses,
  SocialMediaLinks,
} from "@domains/account";
import { useTheme } from "../../hooks/useTheme";
import {
  AddressFields,
  FormField,
  FormScreenLayout,
  SegmentedOptionGroup,
  SocialMediaFields,
  TextField,
  ConfirmDialog,
} from "../../components";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";

type Props = AccountsStackScreenProps<"AccountForm">;

export const AccountFormScreen = ({ route, navigation }: Props) => {
  const { accountId } = route.params ?? {};
  const account = useAccount(accountId ?? "");
  const allOrganizations = useOrganizations();
  const deviceId = useDeviceId();
  const { createAccount, updateAccount } = useAccountActions(deviceId);
  const { colors } = useTheme();
  const { dialogProps, showAlert } = useConfirmDialog();

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
  const statusOptions = [
    { value: "account.status.active", label: t("status.active") },
    { value: "account.status.inactive", label: t("status.inactive") },
  ] as const;

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
      showAlert(
        t("common.validationError"),
        t("accounts.validation.nameRequired"),
        t("common.ok"),
      );
      return;
    }

    if (!organizationId) {
      showAlert(
        t("common.validationError"),
        t("accounts.validation.organizationRequired"),
        t("common.ok"),
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
        account ?? undefined,
      );
      if (result.success) {
        navigation.goBack();
      } else {
        showAlert(
          t("common.error"),
          result.error || t("accounts.updateError"),
          t("common.ok"),
        );
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
        showAlert(
          t("common.error"),
          result.error || t("accounts.createError"),
          t("common.ok"),
        );
      }
    }
  };

  const selectedOrganization = organizations.find(
    (org) => org.id === organizationId,
  );

  return (
    <FormScreenLayout>
      <FormField label={`${t("accounts.fields.name")} *`}>
        <TextField
          value={name}
          onChangeText={handleNameChange}
          placeholder={t("accounts.form.namePlaceholder")}
          autoFocus
        />
      </FormField>

      <FormField
        label={`${t("accounts.fields.organization")} *`}
        hint={
          organizations.length === 0
            ? t("accounts.form.organizationEmptyHint")
            : undefined
        }
      >
        {organizations.length === 0 ? null : (
          <TouchableOpacity
            style={[
              styles.pickerButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => setIsOrganizationPickerOpen(true)}
            accessibilityRole="button"
          >
            <Text
              style={[styles.pickerButtonText, { color: colors.textSecondary }]}
            >
              {selectedOrganization?.name ??
                t("accounts.form.organizationPlaceholder")}
            </Text>
            <Text style={[styles.pickerChevron, { color: colors.chevron }]}>
              ▼
            </Text>
          </TouchableOpacity>
        )}
      </FormField>

      <FormField label={t("accounts.fields.status")}>
        <SegmentedOptionGroup
          options={statusOptions}
          value={status}
          onChange={handleStatusChange}
        />
      </FormField>

      <AddressFields
        labelKey="accounts.fields.siteAddress"
        address={siteAddress}
        onChange={handleSiteAddressChange}
      />

      <FormField>
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
            {t("accounts.form.useSameAddressForParking")}
          </Text>
        </TouchableOpacity>
      </FormField>

      {!useSameForParking && (
        <AddressFields
          labelKey="accounts.fields.parkingAddress"
          address={parkingAddress}
          onChange={handleParkingAddressChange}
        />
      )}

      <FormField label={t("accounts.fields.website")}>
        <TextField
          value={website}
          onChangeText={(value) => {
            setWebsite(value);
          }}
          placeholder={t("common.placeholders.website")}
          keyboardType="url"
          autoCapitalize="none"
        />
      </FormField>

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
        <Text style={[styles.saveButtonText, { color: colors.onAccent }]}>
          {accountId
            ? t("accounts.form.updateButton")
            : t("accounts.form.createButton")}
        </Text>
      </TouchableOpacity>

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
              {t("accounts.form.organizationPickerTitle")}
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

      {dialogProps ? <ConfirmDialog {...dialogProps} /> : null}
    </FormScreenLayout>
  );
};

const styles = StyleSheet.create({
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
