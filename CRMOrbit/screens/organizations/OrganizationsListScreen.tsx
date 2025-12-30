import { StyleSheet, Text, View } from "react-native";

import type { OrganizationsStackScreenProps } from "../../navigation/types";
import { useOrganizations } from "../../crm-core/views/store";
import type { Organization } from "../../crm-core/domains/organization";
import { ListCard, ListCardChevron, ListScreenLayout, StatusBadge } from "../../components";
import { colors } from "../../theme/colors";

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
    <ListCard onPress={() => handlePress(item)} style={styles.cardRow}>
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item.name}</Text>
          <StatusBadge
            isActive={item.status === "organization.status.active"}
            activeLabel="Active"
            inactiveLabel="Inactive"
          />
        </View>
      </View>
      <ListCardChevron />
    </ListCard>
  );

  return (
    <ListScreenLayout
      data={organizations}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      emptyTitle="No organizations yet"
      emptyHint="Tap the + button to create one"
      onAdd={handleAdd}
    />
  );
};

const styles = StyleSheet.create({
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    color: colors.textPrimary,
    flex: 1,
  },
});
