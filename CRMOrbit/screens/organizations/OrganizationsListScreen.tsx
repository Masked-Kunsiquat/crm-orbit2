import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { OrganizationsStackScreenProps } from "../../navigation/types";
import { useOrganizations } from "../../crm-core/views/store";
import type { Organization } from "../../crm-core/domains/organization";

type Props = OrganizationsStackScreenProps<"OrganizationsList">;

export const OrganizationsListScreen = ({ navigation }: Props) => {
  const organizations = useOrganizations();

  const handlePress = (org: Organization) => {
    navigation.navigate("OrganizationDetail", { organizationId: org.id });
  };

  const handleAdd = () => {
    navigation.navigate("OrganizationForm", {});
  };

  const renderItem = ({ item }: { item: Organization }) => (
    <TouchableOpacity style={styles.item} onPress={() => handlePress(item)}>
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item.name}</Text>
          <View
            style={[
              styles.statusBadge,
              item.status === "organization.status.active"
                ? styles.statusActive
                : styles.statusInactive,
            ]}
          >
            <Text style={styles.statusText}>
              {item.status === "organization.status.active" ? "Active" : "Inactive"}
            </Text>
          </View>
        </View>
      </View>
      <Text style={styles.itemChevron}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={organizations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No organizations yet</Text>
            <Text style={styles.emptyHint}>Tap the + button to create one</Text>
          </View>
        }
      />
      <TouchableOpacity style={styles.fab} onPress={handleAdd}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f2ee",
  },
  list: {
    padding: 16,
  },
  item: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1b1b1b",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusActive: {
    backgroundColor: "#e8f5e9",
  },
  statusInactive: {
    backgroundColor: "#ffebee",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  itemChevron: {
    fontSize: 24,
    color: "#ccc",
    marginLeft: 12,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: "#bbb",
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1f5eff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: {
    fontSize: 32,
    color: "#fff",
    fontWeight: "300",
  },
});
