import { useState, useEffect, useRef } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

import { t } from "@i18n/index";
import type { OrganizationsStackScreenProps } from "@views/navigation/types";
import { useOrganization } from "@views/store/store";
import { useOrganizationActions } from "@views/hooks";
import type { SocialMediaLinks } from "@domains/organization";
import { useTheme } from "@views/hooks/useTheme";

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
        "Permission Required",
        "Please grant photo library access to select a logo",
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
        Alert.alert("Error", result.error || "Failed to update organization");
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
        Alert.alert("Error", result.error || "Failed to create organization");
      }
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.canvas }]}>
      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Organization Name *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
            value={name}
            onChangeText={handleNameChange}
            placeholder="Enter organization name"
            placeholderTextColor={colors.textMuted}
            autoFocus
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Logo</Text>
          <TouchableOpacity
            style={[styles.imagePickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handlePickImage}
          >
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.logoPreview} />
            ) : (
              <Text style={[styles.imagePickerText, { color: colors.textMuted }]}>Tap to select logo</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Website</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
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

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Social Media</Text>
          <TextInput
            style={[styles.input, styles.socialInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
            value={socialMedia.x || ""}
            onChangeText={(value) => handleSocialMediaChange("x", value)}
            placeholder="X (Twitter) username or URL"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, styles.socialInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
            value={socialMedia.linkedin || ""}
            onChangeText={(value) => handleSocialMediaChange("linkedin", value)}
            placeholder="LinkedIn URL"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, styles.socialInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
            value={socialMedia.facebook || ""}
            onChangeText={(value) => handleSocialMediaChange("facebook", value)}
            placeholder="Facebook URL"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, styles.socialInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
            value={socialMedia.instagram || ""}
            onChangeText={(value) =>
              handleSocialMediaChange("instagram", value)
            }
            placeholder="Instagram username or URL"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Status</Text>
          <View style={styles.statusButtons}>
            <TouchableOpacity
              style={[
                styles.statusButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
                status === "organization.status.active" &&
                  { backgroundColor: colors.accent, borderColor: colors.accent },
              ]}
              onPress={() => handleStatusChange("organization.status.active")}
            >
              <Text
                style={[
                  styles.statusButtonText,
                  { color: colors.textSecondary },
                  status === "organization.status.active" &&
                    { color: colors.surface },
                ]}
              >
                Active
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.statusButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
                status === "organization.status.inactive" &&
                  { backgroundColor: colors.accent, borderColor: colors.accent },
              ]}
              onPress={() => handleStatusChange("organization.status.inactive")}
            >
              <Text
                style={[
                  styles.statusButtonText,
                  { color: colors.textSecondary },
                  status === "organization.status.inactive" &&
                    { color: colors.surface },
                ]}
              >
                Inactive
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.accent }]} onPress={handleSave}>
          <Text style={[styles.saveButtonText, { color: colors.surface }]}>
            {organizationId ? "Update Organization" : "Create Organization"}
          </Text>
        </TouchableOpacity>
      </View>
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
  socialInput: {
    marginTop: 8,
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
});
