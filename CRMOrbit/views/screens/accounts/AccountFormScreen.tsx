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

import type { AccountsStackScreenProps } from "../../navigation/types";
import { useAccount, useOrganizations } from "../../store/store";
import { useAccountActions } from "../../hooks";

const DEVICE_ID = "device-local";

type Props = AccountsStackScreenProps<"AccountForm">;

export const AccountFormScreen = ({ route, navigation }: Props) => {
  const { accountId } = route.params ?? {};
  const account = useAccount(accountId ?? "");
  const allOrganizations = useOrganizations();
  const { createAccount, updateAccount } = useAccountActions(DEVICE_ID);

  // Sort organizations alphabetically by name
  const organizations = [...allOrganizations].sort((a, b) => a.name.localeCompare(b.name));

  const [name, setName] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [status, setStatus] = useState<"account.status.active" | "account.status.inactive">(
    "account.status.active",
  );
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
      } else {
        // New account - reset to defaults
        setName("");
        setOrganizationId(organizations[0]?.id ?? "");
        setStatus("account.status.active");
      }
    }
  }, [accountId, account, organizations]);

  const handleNameChange = (value: string) => {
    setName(value);
    setIsDirty(true);
  };

  const handleStatusChange = (value: "account.status.active" | "account.status.inactive") => {
    setStatus(value);
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

    if (accountId) {
      const result = updateAccount(accountId, name.trim(), status, organizationId);
      if (result.success) {
        navigation.goBack();
      } else {
        Alert.alert("Error", result.error || "Failed to update account");
      }
    } else {
      const result = createAccount(organizationId, name.trim(), status);
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
          <View style={styles.organizationPicker}>
            {organizations.map((org) => (
              <TouchableOpacity
                key={org.id}
                style={[
                  styles.organizationOption,
                  organizationId === org.id && styles.organizationOptionSelected,
                ]}
                onPress={() => {
                  setOrganizationId(org.id);
                  setIsDirty(true);
                }}
              >
                <Text
                  style={[
                    styles.organizationOptionText,
                    organizationId === org.id && styles.organizationOptionTextSelected,
                  ]}
                >
                  {org.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {organizations.length === 0 && (
            <Text style={styles.hint}>No organizations available. Create one first.</Text>
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
                  status === "account.status.active" && styles.statusButtonTextActive,
                ]}
              >
                Active
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.statusButton,
                status === "account.status.inactive" && styles.statusButtonActive,
              ]}
              onPress={() => handleStatusChange("account.status.inactive")}
            >
              <Text
                style={[
                  styles.statusButtonText,
                  status === "account.status.inactive" && styles.statusButtonTextActive,
                ]}
              >
                Inactive
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, organizations.length === 0 && styles.saveButtonDisabled]}
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
  organizationPicker: {
    gap: 8,
  },
  organizationOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  organizationOptionSelected: {
    backgroundColor: "#1f5eff",
    borderColor: "#1f5eff",
  },
  organizationOptionText: {
    fontSize: 15,
    color: "#666",
    fontWeight: "500",
  },
  organizationOptionTextSelected: {
    color: "#fff",
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
});
