import { Platform } from "react-native";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  Pressable,
} from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import { t } from "@i18n/index";
import type { AccountsStackScreenProps } from "../../navigation/types";
import { useAccount, useOrganizations } from "../../store/store";
import { useAccountActions, useDeviceId } from "../../hooks";
import type { AccountAddresses, SocialMediaLinks } from "@domains/account";
import { formatDate } from "@domains/shared/dateFormatting";
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
import { useAccountFormState } from "../../hooks/useAccountFormState";

type Props = AccountsStackScreenProps<"AccountForm">;

// Static option configurations
const statusOptions = [
  { value: "account.status.active", label: t("status.active") },
  { value: "account.status.inactive", label: t("status.inactive") },
] as const;

const auditFrequencyOptions = [
  {
    value: "account.auditFrequency.monthly",
    label: t("account.auditFrequency.monthly"),
  },
  {
    value: "account.auditFrequency.bimonthly",
    label: t("account.auditFrequency.bimonthly"),
  },
  {
    value: "account.auditFrequency.quarterly",
    label: t("account.auditFrequency.quarterly"),
  },
  {
    value: "account.auditFrequency.triannually",
    label: t("account.auditFrequency.triannually"),
  },
] as const;

const auditFrequencyTimingOptions = [
  {
    value: "account.auditFrequencyChange.immediate",
    label: t("accounts.auditFrequencyChange.immediate"),
  },
  {
    value: "account.auditFrequencyChange.nextPeriod",
    label: t("accounts.auditFrequencyChange.nextPeriod"),
  },
] as const;

// Validation helpers
const parseFloorValue = (value: string): number | undefined | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed)) {
    return null;
  }
  return parsed;
};

const parseExcludedFloors = (value: string): number[] | undefined | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parts = trimmed.split(",");
  const floors: number[] = [];
  for (const part of parts) {
    const entry = part.trim();
    if (!entry) {
      continue;
    }
    const parsed = Number(entry);
    if (!Number.isInteger(parsed)) {
      return null;
    }
    floors.push(parsed);
  }
  return floors.length > 0 ? floors : undefined;
};

export const AccountFormScreen = ({ route, navigation }: Props) => {
  const { accountId, organizationId: prefillOrganizationId } =
    route.params ?? {};
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

  const formState = useAccountFormState({
    account: account ?? undefined,
    prefillOrganizationId,
    defaultOrganizationId: organizations[0]?.id,
  });

  const {
    name,
    setName,
    organizationId,
    setOrganizationId,
    status,
    activeAt,
    inactiveAt,
    activeDatePicker,
    setActiveDatePicker,
    getLifecycleDate,
    updateLifecycleDate,
    auditFrequency,
    auditFrequencyChangeTiming,
    setAuditFrequencyChangeTiming,
    isFrequencyChanged,
    siteAddress,
    parkingAddress,
    useSameForParking,
    minFloorInput,
    setMinFloorInput,
    maxFloorInput,
    setMaxFloorInput,
    excludedFloorsInput,
    setExcludedFloorsInput,
    website,
    setWebsite,
    socialMedia,
    isOrganizationPickerOpen,
    setIsOrganizationPickerOpen,
    handleSiteAddressChange,
    handleParkingAddressChange,
    handleUseSameForParkingChange,
    handleSocialMediaChange,
    handleAuditFrequencyChange,
    handleStatusChange,
  } = formState;

  // Date picker handlers
  const handleDatePickerChange = (
    field: "activeAt" | "inactiveAt",
    event: DateTimePickerEvent,
    date?: Date,
  ) => {
    if (event.type === "dismissed") {
      setActiveDatePicker(null);
      return;
    }
    if (date) {
      updateLifecycleDate(field, date);
    }
    setActiveDatePicker(null);
  };

  const openDatePicker = (field: "activeAt" | "inactiveAt") => {
    if (Platform.OS === "android") {
      const currentDate = getLifecycleDate(field);
      DateTimePickerAndroid.open({
        mode: "date",
        value: currentDate,
        onChange: (event, date) => {
          if (event.type === "set" && date) {
            updateLifecycleDate(field, date);
          }
        },
      });
    } else {
      setActiveDatePicker(field);
    }
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

    const minFloorParsed = parseFloorValue(minFloorInput);
    if (minFloorParsed === null) {
      showAlert(
        t("common.validationError"),
        t("accounts.validation.floorValueInvalid"),
        t("common.ok"),
      );
      return;
    }
    const maxFloorParsed = parseFloorValue(maxFloorInput);
    if (maxFloorParsed === null) {
      showAlert(
        t("common.validationError"),
        t("accounts.validation.floorValueInvalid"),
        t("common.ok"),
      );
      return;
    }
    const excludedFloorsParsed = parseExcludedFloors(excludedFloorsInput);
    if (excludedFloorsParsed === null) {
      showAlert(
        t("common.validationError"),
        t("accounts.validation.excludedFloorsInvalid"),
        t("common.ok"),
      );
      return;
    }

    const hasMinFloor = minFloorParsed !== undefined;
    const hasMaxFloor = maxFloorParsed !== undefined;
    if (hasMinFloor !== hasMaxFloor) {
      showAlert(
        t("common.validationError"),
        t("accounts.validation.floorRangeRequired"),
        t("common.ok"),
      );
      return;
    }

    if (hasMinFloor && hasMaxFloor && minFloorParsed > maxFloorParsed) {
      showAlert(
        t("common.validationError"),
        t("accounts.validation.floorRangeInvalid"),
        t("common.ok"),
      );
      return;
    }

    if (excludedFloorsParsed && excludedFloorsParsed.length > 0) {
      if (!hasMinFloor || !hasMaxFloor) {
        showAlert(
          t("common.validationError"),
          t("accounts.validation.excludedFloorsRequireRange"),
          t("common.ok"),
        );
        return;
      }

      const unique = new Set(excludedFloorsParsed);
      if (unique.size !== excludedFloorsParsed.length) {
        showAlert(
          t("common.validationError"),
          t("accounts.validation.excludedFloorsUnique"),
          t("common.ok"),
        );
        return;
      }

      for (const floor of excludedFloorsParsed) {
        if (floor < minFloorParsed || floor > maxFloorParsed) {
          showAlert(
            t("common.validationError"),
            t("accounts.validation.excludedFloorsOutOfRange"),
            t("common.ok"),
          );
          return;
        }
      }
    }

    if (accountId) {
      const result = updateAccount(
        accountId,
        name.trim(),
        status,
        organizationId,
        addresses,
        website.trim() || undefined,
        hasSocialMedia ? socialMediaData : undefined,
        minFloorParsed,
        maxFloorParsed,
        excludedFloorsParsed,
        auditFrequency,
        isFrequencyChanged ? auditFrequencyChangeTiming : undefined,
        account ?? undefined,
        activeAt || undefined,
        inactiveAt || null,
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
        minFloorParsed,
        maxFloorParsed,
        excludedFloorsParsed,
        auditFrequency,
        activeAt || undefined,
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
          onChangeText={setName}
          placeholder={t("accounts.form.namePlaceholder")}
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

      <FormField label={t("accounts.fields.activeAt")}>
        <TouchableOpacity
          style={[
            styles.dateButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={() => openDatePicker("activeAt")}
        >
          <Text style={[styles.dateButtonText, { color: colors.textPrimary }]}>
            {activeAt ? formatDate(activeAt) : t("accounts.form.selectDate")}
          </Text>
        </TouchableOpacity>
      </FormField>

      {status === "account.status.inactive" ? (
        <FormField label={t("accounts.fields.inactiveAt")}>
          <TouchableOpacity
            style={[
              styles.dateButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => openDatePicker("inactiveAt")}
          >
            <Text
              style={[styles.dateButtonText, { color: colors.textPrimary }]}
            >
              {inactiveAt
                ? formatDate(inactiveAt)
                : t("accounts.form.selectDate")}
            </Text>
          </TouchableOpacity>
        </FormField>
      ) : null}

      <FormField label={t("accounts.fields.auditFrequency")}>
        <SegmentedOptionGroup
          options={auditFrequencyOptions}
          value={auditFrequency}
          onChange={handleAuditFrequencyChange}
        />
      </FormField>
      {isFrequencyChanged ? (
        <FormField label={t("accounts.fields.auditFrequencyChangeTiming")}>
          <SegmentedOptionGroup
            options={auditFrequencyTimingOptions}
            value={auditFrequencyChangeTiming}
            onChange={setAuditFrequencyChangeTiming}
          />
        </FormField>
      ) : null}

      <FormField label={t("accounts.fields.minFloor")}>
        <TextField
          value={minFloorInput}
          onChangeText={setMinFloorInput}
          placeholder={t("accounts.form.minFloorPlaceholder")}
          keyboardType="numbers-and-punctuation"
        />
      </FormField>

      <FormField label={t("accounts.fields.maxFloor")}>
        <TextField
          value={maxFloorInput}
          onChangeText={setMaxFloorInput}
          placeholder={t("accounts.form.maxFloorPlaceholder")}
          keyboardType="numbers-and-punctuation"
        />
      </FormField>

      <FormField
        label={t("accounts.fields.excludedFloors")}
        hint={t("accounts.form.excludedFloorsHint")}
      >
        <TextField
          value={excludedFloorsInput}
          onChangeText={setExcludedFloorsInput}
          placeholder={t("accounts.form.excludedFloorsPlaceholder")}
          keyboardType="numbers-and-punctuation"
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
            {useSameForParking && (
              <Text style={[styles.checkmark, { color: colors.onAccent }]}>
                ✓
              </Text>
            )}
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
          onChangeText={setWebsite}
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
        <View
          style={[
            styles.modalOverlay,
            { backgroundColor: colors.overlayScrim },
          ]}
        >
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

      {activeDatePicker && Platform.OS === "ios" ? (
        <DateTimePicker
          value={getLifecycleDate(activeDatePicker)}
          mode="date"
          onChange={(event, date) =>
            handleDatePickerChange(activeDatePicker, event, date)
          }
        />
      ) : null}

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
  dateButton: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  dateButtonText: {
    fontSize: 16,
  },
  pickerChevron: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
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
    fontSize: 16,
    fontWeight: "600",
  },
  checkboxLabel: {
    fontSize: 15,
  },
});
