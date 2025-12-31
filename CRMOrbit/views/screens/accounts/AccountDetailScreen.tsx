import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, Pressable } from "react-native";

import type { AccountsStackScreenProps } from "../../navigation/types";
import { useAccount, useOrganization, useContacts } from "../../store/store";
import { useAccountActions } from "../../hooks/useAccountActions";
import { getContactDisplayName } from "@domains/contact.utils";

const DEVICE_ID = "device-local";

type Props = AccountsStackScreenProps<"AccountDetail">;

export const AccountDetailScreen = ({ route, navigation }: Props) => {
  const { accountId } = route.params;
  const account = useAccount(accountId);
  const organization = useOrganization(account?.organizationId ?? "");
  const contacts = useContacts(accountId);
  const { deleteAccount } = useAccountActions(DEVICE_ID);

  if (!account) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Account not found</Text>
      </View>
    );
  }

  const handleEdit = () => {
    navigation.navigate("AccountForm", { accountId: account.id });
  };

  const handleDelete = () => {
    if (contacts.length > 0) {
      Alert.alert(
        "Cannot Delete",
        `Cannot delete "${account.name}" because it has ${contacts.length} linked contact(s). Please unlink them first.`,
        [{ text: "OK" }],
      );
      return;
    }

    Alert.alert(
      "Delete Account",
      `Are you sure you want to delete "${account.name}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const result = deleteAccount(account.id);
            if (result.success) {
              navigation.goBack();
            } else {
              Alert.alert("Error", result.error ?? "Failed to delete account");
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <View style={styles.header}>
          <Text style={styles.title}>{account.name}</Text>
          <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Organization</Text>
          <Text style={styles.value}>{organization?.name ?? "Unknown"}</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Status</Text>
          <View
            style={[
              styles.statusBadge,
              account.status === "account.status.active"
                ? styles.statusActive
                : styles.statusInactive,
            ]}
          >
            <Text style={styles.statusText}>
              {account.status === "account.status.active" ? "Active" : "Inactive"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contacts ({contacts.length})</Text>
        {contacts.length === 0 ? (
          <Text style={styles.emptyText}>No contacts linked to this account.</Text>
        ) : (
          contacts.map((contact) => (
            <Pressable
              key={contact.id}
              style={styles.contactCard}
              onPress={() => {
                // Navigate to ContactsTab (cast to any to bypass TypeScript navigation typing)
                (navigation.navigate as any)("ContactsTab", {
                  screen: "ContactDetail",
                  params: { contactId: contact.id },
                });
              }}
            >
              <View style={styles.contactCardContent}>
                <Text style={styles.contactName}>{getContactDisplayName(contact)}</Text>
                {contact.title && <Text style={styles.contactTitle}>{contact.title}</Text>}
                <Text style={styles.contactType}>{contact.type}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))
        )}
      </View>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteButtonText}>Delete Account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f2ee",
  },
  section: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1b1b1b",
    flex: 1,
  },
  editButton: {
    backgroundColor: "#1f5eff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  value: {
    fontSize: 16,
    color: "#1b1b1b",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  statusActive: {
    backgroundColor: "#e8f5e9",
  },
  statusInactive: {
    backgroundColor: "#ffebee",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1b1b1b",
    marginBottom: 12,
  },
  contactCard: {
    padding: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 6,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  contactCardContent: {
    flex: 1,
  },
  chevron: {
    fontSize: 20,
    color: "#cccccc",
    marginLeft: 8,
  },
  contactName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1b1b1b",
    marginBottom: 2,
  },
  contactTitle: {
    fontSize: 12,
    color: "#666666",
    fontStyle: "italic",
    marginBottom: 4,
  },
  contactType: {
    fontSize: 12,
    color: "#666",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },
  metadataText: {
    fontSize: 12,
    fontFamily: "monospace",
    color: "#666",
  },
  errorText: {
    fontSize: 16,
    color: "#b00020",
    textAlign: "center",
    marginTop: 32,
  },
  deleteButton: {
    backgroundColor: "#b00020",
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
