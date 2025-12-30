import { useState, useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";

import type { OrganizationsStackScreenProps } from "../../navigation/types";
import { useOrganization } from "../../crm-core/views/store";
import { useOrganizationActions } from "../../crm-core/hooks";

const DEVICE_ID = "device-local";

type Props = OrganizationsStackScreenProps<"OrganizationForm">;

export const OrganizationFormScreen = ({ route, navigation }: Props) => {
  const { organizationId } = route.params ?? {};
  const organization = useOrganization(organizationId ?? "");
  const { createOrganization, updateOrganization } = useOrganizationActions(DEVICE_ID);

  const [name, setName] = useState("");
  const [status, setStatus] = useState<"organization.status.active" | "organization.status.inactive">(
    "organization.status.active",
  );

  useEffect(() => {
    if (organization) {
      setName(organization.name);
      setStatus(organization.status);
    }
  }, [organization]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Organization name is required");
      return;
    }

    if (organizationId) {
      const result = updateOrganization(organizationId, name.trim(), status);
      if (result.success) {
        navigation.goBack();
      } else {
        Alert.alert("Error", "Failed to update organization");
      }
    } else {
      const result = createOrganization(name.trim());
      if (result.success) {
        navigation.goBack();
      } else {
        Alert.alert("Error", "Failed to create organization");
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
            onChangeText={setName}
            placeholder="Enter organization name"
            autoFocus
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.statusButtons}>
            <TouchableOpacity
              style={[
                styles.statusButton,
                status === "organization.status.active" && styles.statusButtonActive,
              ]}
              onPress={() => setStatus("organization.status.active")}
            >
              <Text
                style={[
                  styles.statusButtonText,
                  status === "organization.status.active" && styles.statusButtonTextActive,
                ]}
              >
                Active
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.statusButton,
                status === "organization.status.inactive" && styles.statusButtonActive,
              ]}
              onPress={() => setStatus("organization.status.inactive")}
            >
              <Text
                style={[
                  styles.statusButtonText,
                  status === "organization.status.inactive" && styles.statusButtonTextActive,
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
