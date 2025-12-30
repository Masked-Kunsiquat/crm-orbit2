import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { AccountsStackScreenProps } from "../../navigation/types";
import { useAccount, useOrganization, useContacts } from "../../crm-core/views/store";

type Props = AccountsStackScreenProps<"AccountDetail">;

export const AccountDetailScreen = ({ route, navigation }: Props) => {
  const { accountId } = route.params;
  const account = useAccount(accountId);
  const organization = useOrganization(account?.organizationId ?? "");
  const contacts = useContacts(accountId);

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
            <View key={contact.id} style={styles.contactCard}>
              <Text style={styles.contactName}>{contact.name}</Text>
              <Text style={styles.contactType}>{contact.type}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Metadata</Text>
        <Text style={styles.metadataText}>
          {JSON.stringify(account.metadata ?? {}, null, 2)}
        </Text>
      </View>
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
  },
  contactName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1b1b1b",
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
});
