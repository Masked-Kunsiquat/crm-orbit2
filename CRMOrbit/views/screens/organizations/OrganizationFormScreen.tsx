import { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, TouchableOpacity, Alert, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { t } from "@i18n/index";
import type { OrganizationsStackScreenProps } from "@views/navigation/types";
import { useOrganization } from "@views/store/store";
import { useOrganizationActions } from "@views/hooks";
import type { SocialMediaLinks } from "@domains/organization";
import { useTheme } from "@views/hooks/useTheme";
import {
  FormField,
  FormScreenLayout,
  SegmentedOptionGroup,
  SocialMediaFields,
  TextField,
} from "@views/components";

const DEVICE_ID = "device-local";

type Props = OrganizationsStackScreenProps<"OrganizationForm">;

export const OrganizationFormScreen = ({ route, navigation }: Props) => {
  const { organizationId } = route.params ?? {};
  const organization = useOrganization(organizationId ?? "");
  const { createOrganization, updateOrganization } =
    useOrganizationActions(DEVICE_ID);
  const { colors } = useTheme();

  const [name, setName] = useState("");
  const [status, setStatus] = useState<
    "organization.status.active" | "organization.status.inactive"
  >("organization.status.active");
  const [logoUri, setLogoUri] = useState<string | undefined>(undefined);
  const [website, setWebsite] = useState("");
  const [socialMedia, setSocialMedia] = useState<SocialMediaLinks>({});
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
      Alert.alert(
        t("organizations.form.logoPermissionTitle"),
        t("organizations.form.logoPermissionMessage"),
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
      setLogoUri(result.assets[0].uri);
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
      Alert.alert(
        t("common.validationError"),
        t("organizations.validation.nameRequired"),
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
      );
      if (result.success) {
        navigation.goBack();
      } else {
        console.error("Update failed:", result.error);
        Alert.alert(
          t("common.error"),
          result.error || t("organizations.updateError"),
        );
      }
    } else {
      const result = createOrganization(
        name.trim(),
        status,
        logoUri,
        website.trim() || undefined,
        hasSocialMedia ? socialMediaData : undefined,
      );
      if (result.success) {
        navigation.goBack();
      } else {
        console.error("Create failed:", result.error);
        Alert.alert(
          t("common.error"),
          result.error || t("organizations.createError"),
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
        >
          {logoUri ? (
            <Image source={{ uri: logoUri }} style={styles.logoPreview} />
          ) : (
            <Text style={[styles.imagePickerText, { color: colors.textMuted }]}>
              {t("organizations.form.logoPlaceholder")}
            </Text>
          )}
        </TouchableOpacity>
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
        <Text style={[styles.saveButtonText, { color: colors.surface }]}>
          {organizationId
            ? t("organizations.form.updateButton")
            : t("organizations.form.createButton")}
        </Text>
      </TouchableOpacity>
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
