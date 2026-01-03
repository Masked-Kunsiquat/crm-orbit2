import { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { persistImage, deletePersistedImage } from "@utils/imageStorage";

import { t } from "@i18n/index";
import type { OrganizationsStackScreenProps } from "@views/navigation/types";
import { useOrganization } from "@views/store/store";
import { useDeviceId, useOrganizationActions } from "@views/hooks";
import type { SocialMediaLinks } from "@domains/organization";
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
  const [status, setStatus] = useState<
    "organization.status.active" | "organization.status.inactive"
  >("organization.status.active");
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
        setLogoUri(organization.logoUri);
        setWebsite(organization.website || "");
        setSocialMedia(organization.socialMedia || {});
      } else {
        // New organization - reset to defaults
        setName("");
        setStatus("organization.status.active");
        setLogoUri(undefined);
        setWebsite("");
        setSocialMedia({});
      }
    }
  }, [organizationId, organization]);

  const handleNameChange = (value: string) => {
    setName(value);
  };

  const handleStatusChange = (
    value: "organization.status.active" | "organization.status.inactive",
  ) => {
    setStatus(value);
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
      if (logoUri && logoUri.startsWith("file://")) {
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
          autoFocus
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
});
