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

import type { OrganizationsStackScreenProps } from "@views/navigation/types";
import { useOrganization } from "@views/store/store";
import { useOrganizationActions } from "@views/hooks";
import type { SocialMediaLinks } from "@domains/organization";

const DEVICE_ID = "device-local";

type Props = OrganizationsStackScreenProps<"OrganizationForm">;

export const OrganizationFormScreen = ({ route, navigation }: Props) => {
  const { organizationId } = route.params ?? {};
  const organization = useOrganization(organizationId ?? "");
  const { createOrganization, updateOrganization } =
    useOrganizationActions(DEVICE_ID);

  const [name, setName] = useState("");
  const [status, setStatus] = useState<
    "organization.status.active" | "organization.status.inactive"
  >("organization.status.active");
  const [logoUri, setLogoUri] = useState<string | undefined>(undefined);
  const [website, setWebsite] = useState("");
  const [socialMedia, setSocialMedia] = useState<SocialMediaLinks>({});
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_isDirty, setIsDirty] = useState(false);
  const lastOrgIdRef = useRef<string | undefined>(undefined);

  // Only populate form fields on initial mount or when switching to a different organization
  useEffect(() => {
    const currentOrgId = organizationId ?? undefined;
    const isOrgChanged = currentOrgId !== lastOrgIdRef.current;

    if (isOrgChanged) {
      // Reset dirty flag when switching organizations
      setIsDirty(false);
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
    setIsDirty(true);
  };

  const handleStatusChange = (
    value: "organization.status.active" | "organization.status.inactive",
  ) => {
    setStatus(value);
    setIsDirty(true);
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
      setIsDirty(true);
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
    setIsDirty(true);
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Organization name is required");
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
      console.log("Update result:", result);
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
      console.log("Create result:", result);
      if (result.success) {
        navigation.goBack();
      } else {
        console.error("Create failed:", result.error);
        Alert.alert("Error", result.error || "Failed to create organization");
      }
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Organization Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={handleNameChange}
            placeholder="Enter organization name"
            autoFocus
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Logo</Text>
          <TouchableOpacity
            style={styles.imagePickerButton}
            onPress={handlePickImage}
          >
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.logoPreview} />
            ) : (
              <Text style={styles.imagePickerText}>Tap to select logo</Text>
            )}
          </TouchableOpacity>
        </View>

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

        <View style={styles.field}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.statusButtons}>
            <TouchableOpacity
              style={[
                styles.statusButton,
                status === "organization.status.active" &&
                  styles.statusButtonActive,
              ]}
              onPress={() => handleStatusChange("organization.status.active")}
            >
              <Text
                style={[
                  styles.statusButtonText,
                  status === "organization.status.active" &&
                    styles.statusButtonTextActive,
                ]}
              >
                Active
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.statusButton,
                status === "organization.status.inactive" &&
                  styles.statusButtonActive,
              ]}
              onPress={() => handleStatusChange("organization.status.inactive")}
            >
              <Text
                style={[
                  styles.statusButtonText,
                  status === "organization.status.inactive" &&
                    styles.statusButtonTextActive,
                ]}
              >
                Inactive
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>
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
  imagePickerButton: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
  },
  imagePickerText: {
    fontSize: 14,
    color: "#999",
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
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
