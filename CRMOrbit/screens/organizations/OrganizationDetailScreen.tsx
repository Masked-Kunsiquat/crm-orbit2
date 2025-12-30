import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { OrganizationsStackScreenProps } from "../../navigation/types";
import { useOrganization, useAccountsByOrganization } from "../../crm-core/views/store";

type Props = OrganizationsStackScreenProps<"OrganizationDetail">;

export const OrganizationDetailScreen = ({ route, navigation }: Props) => {
  const { organizationId } = route.params;
  const organization = useOrganization(organizationId);
  const accounts = useAccountsByOrganization(organizationId);

  if (!organization) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Organization not found</Text>
      </View>
    );
  }

  const handleEdit = () => {
    navigation.navigate("OrganizationForm", { organizationId });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{organization.name}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>{organization.status}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Created</Text>
        <Text style={styles.value}>{new Date(organization.createdAt).toLocaleString()}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accounts ({accounts.length})</Text>
        {accounts.length === 0 ? (
          <Text style={styles.emptyText}>No accounts yet</Text>
        ) : (
          accounts.map((account) => (
            <View key={account.id} style={styles.relatedItem}>
              <Text style={styles.relatedName}>{account.name}</Text>
              <Text style={styles.relatedMeta}>{account.status}</Text>
            </View>
          ))
        )}
      </View>

      <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
        <Text style={styles.editButtonText}>Edit Organization</Text>
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
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 8,
  },
  label: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  value: {
    fontSize: 16,
    color: "#1b1b1b",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1b1b1b",
    marginBottom: 12,
  },
  relatedItem: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  relatedName: {
    fontSize: 15,
    color: "#1b1b1b",
    marginBottom: 2,
  },
  relatedMeta: {
    fontSize: 13,
    color: "#666",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },
  editButton: {
    backgroundColor: "#1f5eff",
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  editButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    fontSize: 16,
    color: "#b00020",
    textAlign: "center",
    marginTop: 40,
  },
});
