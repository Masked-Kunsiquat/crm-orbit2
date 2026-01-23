import { useState, useEffect, useRef, useCallback } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { persistImage, deletePersistedImage } from "@utils/imageStorage";

import { t } from "@i18n/index";
import type { OrganizationsStackScreenProps } from "@views/navigation/types";
import { useOrganization } from "@views/store/store";
import { useDeviceId, useOrganizationActions } from "@views/hooks";
import type { SocialMediaLinks } from "@domains/organization";
import { formatDate } from "@domains/shared/dateFormatting";
import type { Timestamp } from "@domains/shared/types";
import { nextId } from "@domains/shared/idGenerator";
import { useTheme } from "@views/hooks/useTheme";
import {
  FormField,
  FormScreenLayout,
  SegmentedOptionGroup,
  SocialMediaFields,
  TextField,
  ConfirmDialog,
} from "@views/components";
import { useConfirmDialog } from "@views/hooks/useConfirmDialog";

type OrganizationStatus =
  | "organization.status.active"
  | "organization.status.inactive";

type Props = OrganizationsStackScreenProps<"OrganizationForm">;

export const OrganizationFormScreen = ({ route, navigation }: Props) => {
  const { organizationId } = route.params ?? {};
  const organization = useOrganization(organizationId ?? "");
  const deviceId = useDeviceId();
  const { createOrganization, updateOrganization } =
    useOrganizationActions(deviceId);
  const { colors } = useTheme();
  const { dialogProps, showAlert } = useConfirmDialog();

  const [name, setName] = useState("");
  const [status, setStatus] = useState<OrganizationStatus>(
    "organization.status.active",
  );
  const [activeAt, setActiveAt] = useState<Timestamp>("");
  const [inactiveAt, setInactiveAt] = useState<Timestamp>("");
  const [activeDatePicker, setActiveDatePicker] = useState<
    "activeAt" | "inactiveAt" | null
  >(null);
  const [logoUri, setLogoUri] = useState<string | undefined>(undefined);
  const [website, setWebsite] = useState("");
  const [socialMedia, setSocialMedia] = useState<SocialMediaLinks>({});
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const lastOrgIdRef = useRef<string | undefined>(undefined);
  const statusOptions = [
    { value: "organization.status.active", label: t("status.active") },
    { value: "organization.status.inactive", label: t("status.inactive") },
  ] as const;

  // Only populate form fields on initial mount or when switching to a different organization
  useEffect(() => {
    const currentOrgId = organizationId ?? undefined;
    const isOrgChanged = currentOrgId !== lastOrgIdRef.current;

    if (isOrgChanged) {
      lastOrgIdRef.current = currentOrgId;

      if (organization) {
        setName(organization.name);
        setStatus(organization.status);
        setActiveAt(organization.activeAt ?? "");
        setInactiveAt(organization.inactiveAt ?? "");
        setLogoUri(organization.logoUri);
        setWebsite(organization.website || "");
        setSocialMedia(organization.socialMedia || {});
      } else {
        // New organization - reset to defaults
        setName("");
        setStatus("organization.status.active");
        setActiveAt(new Date().toISOString()); // Auto-fill today for new orgs
        setInactiveAt("");
        setLogoUri(undefined);
        setWebsite("");
        setSocialMedia({});
      }
    }
  }, [organizationId, organization]);

  const handleNameChange = (value: string) => {
    setName(value);
  };

  const handleStatusChange = useCallback(
    (value: OrganizationStatus) => {
      setStatus(value);
      // Auto-set inactiveAt when becoming inactive
      if (value === "organization.status.inactive" && !inactiveAt) {
        setInactiveAt(new Date().toISOString());
      }
      // Clear inactiveAt when becoming active
      if (value === "organization.status.active") {
        setInactiveAt("");
      }
    },
    [inactiveAt],
  );

  // Lifecycle date helpers
  const getLifecycleDate = useCallback(
    (field: "activeAt" | "inactiveAt") => {
      const timestamp = field === "activeAt" ? activeAt : inactiveAt;
      const date = new Date(timestamp || new Date().toISOString());
      if (Number.isNaN(date.getTime())) {
        return new Date();
      }
      return date;
    },
    [activeAt, inactiveAt],
  );

  const updateLifecycleDate = useCallback(
    (field: "activeAt" | "inactiveAt", date: Date) => {
      const timestamp = date.toISOString();
      if (field === "activeAt") {
        setActiveAt(timestamp);
      } else {
        setInactiveAt(timestamp);
      }
    },
    [],
  );

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

  const handlePickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      showAlert(
        t("organizations.form.logoPermissionTitle"),
        t("organizations.form.logoPermissionMessage"),
        t("common.ok"),
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const tempUri = result.assets[0].uri;

      // For new organizations, use temp URI and persist on save
      // For existing organizations, persist immediately
      if (organizationId) {
        setIsProcessingImage(true);
        try {
          const permanentUri = await persistImage(
            tempUri,
            "organization",
            organizationId,
          );
          setLogoUri(permanentUri);
        } catch (error) {
          console.error("Failed to persist image:", error);
          showAlert(
            t("common.error"),
            t("organizations.form.saveImageFailed"),
            t("common.ok"),
          );
        } finally {
          setIsProcessingImage(false);
        }
      } else {
        // For new orgs, just store temp URI - will persist on save
        setLogoUri(tempUri);
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (logoUri && !logoUri.startsWith("http")) {
      // If it's a local file, delete it
      await deletePersistedImage(logoUri);
    }
    setLogoUri(undefined);
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

  const handleSave = async () => {
    if (!name.trim()) {
      showAlert(
        t("common.validationError"),
        t("organizations.validation.nameRequired"),
        t("common.ok"),
      );
      return;
    }

    const socialMediaData: SocialMediaLinks = {
      x: socialMedia.x?.trim() || undefined,
      linkedin: socialMedia.linkedin?.trim() || undefined,
      facebook: socialMedia.facebook?.trim() || undefined,
      instagram: socialMedia.instagram?.trim() || undefined,
    };

    const hasSocialMedia = Object.values(socialMediaData).some((v) => v);

    if (organizationId) {
      const result = updateOrganization(
        organizationId,
        name.trim(),
        status,
        logoUri,
        website.trim() || undefined,
        hasSocialMedia ? socialMediaData : undefined,
        organization ?? undefined,
        activeAt || undefined,
        inactiveAt || null,
      );
      if (result.success) {
        navigation.goBack();
      } else {
        console.error("Update failed:", result.error);
        showAlert(
          t("common.error"),
          result.error || t("organizations.updateError"),
          t("common.ok"),
        );
      }
    } else {
      // For new organizations, persist image first if it's a temp URI
      const newOrganizationId = nextId("org");
      let finalLogoUri = logoUri;
      if (
        logoUri &&
        !logoUri.trim().toLowerCase().startsWith("http://") &&
        !logoUri.trim().toLowerCase().startsWith("https://")
      ) {
        setIsProcessingImage(true);
        try {
          finalLogoUri = await persistImage(
            logoUri,
            "organization",
            newOrganizationId,
          );
        } catch (error) {
          console.error("Failed to persist image:", error);
          showAlert(
            t("common.error"),
            t("organizations.form.saveImageCreateFailed"),
            t("common.ok"),
          );
          finalLogoUri = undefined;
        } finally {
          setIsProcessingImage(false);
        }
      }

      const result = createOrganization(
        name.trim(),
        status,
        finalLogoUri,
        website.trim() || undefined,
        hasSocialMedia ? socialMediaData : undefined,
        newOrganizationId,
        activeAt || undefined,
      );
      if (result.success) {
        navigation.goBack();
      } else {
        console.error("Create failed:", result.error);
        showAlert(
          t("common.error"),
          result.error || t("organizations.createError"),
          t("common.ok"),
        );
      }
    }
  };

  return (
    <FormScreenLayout>
      <FormField label={`${t("organizations.form.nameLabel")} *`}>
        <TextField
          value={name}
          onChangeText={handleNameChange}
          placeholder={t("organizations.form.namePlaceholder")}
        />
      </FormField>

      <FormField label={t("organizations.fields.logo")}>
        <TouchableOpacity
          style={[
            styles.imagePickerButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={handlePickImage}
          disabled={isProcessingImage}
        >
          {isProcessingImage ? (
            <ActivityIndicator size="large" color={colors.accent} />
          ) : logoUri ? (
            <Image
              source={{ uri: logoUri }}
              style={styles.logoPreview}
              contentFit="cover"
            />
          ) : (
            <Text style={[styles.imagePickerText, { color: colors.textMuted }]}>
              {t("organizations.form.logoPlaceholder")}
            </Text>
          )}
        </TouchableOpacity>
        {logoUri && (
          <TouchableOpacity
            style={[styles.removeButton, { backgroundColor: colors.error }]}
            onPress={handleRemoveLogo}
          >
            <Text style={[styles.removeButtonText, { color: colors.onError }]}>
              {t("organizations.form.removeLogo")}
            </Text>
          </TouchableOpacity>
        )}
      </FormField>

      <FormField label={t("organizations.fields.website")}>
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
        translationPrefix="organizations"
      />

      <FormField label={t("organizations.fields.status")}>
        <SegmentedOptionGroup
          options={statusOptions}
          value={status}
          onChange={handleStatusChange}
        />
      </FormField>

      <FormField label={t("organizations.fields.activeAt")}>
        <TouchableOpacity
          style={[
            styles.dateButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={() => openDatePicker("activeAt")}
        >
          <Text style={[styles.dateButtonText, { color: colors.textPrimary }]}>
            {activeAt
              ? formatDate(activeAt)
              : t("organizations.form.selectDate")}
          </Text>
        </TouchableOpacity>
      </FormField>

      {status === "organization.status.inactive" ? (
        <FormField label={t("organizations.fields.inactiveAt")}>
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
                : t("organizations.form.selectDate")}
            </Text>
          </TouchableOpacity>
        </FormField>
      ) : null}

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: colors.accent }]}
        onPress={handleSave}
      >
        <Text style={[styles.saveButtonText, { color: colors.onAccent }]}>
          {organizationId
            ? t("organizations.form.updateButton")
            : t("organizations.form.createButton")}
        </Text>
      </TouchableOpacity>

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
  imagePickerButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
  },
  imagePickerText: {
    fontSize: 14,
  },
  logoPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeButton: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: "600",
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
  dateButton: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  dateButtonText: {
    fontSize: 16,
  },
});
