import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

import type { OrganizationsStackScreenProps } from "@views/navigation/types";
import { useOrganizations } from "@views/store/store";
import type { Organization } from "@domains/organization";
import {
  HeaderMenu,
  ListCard,
  ListCardChevron,
  ListScreenLayout,
  StatusBadge,
} from "@views/components";
import { colors } from "@domains/shared/theme/colors";
type Props = OrganizationsStackScreenProps<"OrganizationsList">;

export const OrganizationsListScreen = ({ navigation }: Props) => {
  const organizations = useOrganizations();
  const [showInactive, setShowInactive] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const menuAnchorRef = useRef<View>(null);

  const filteredOrganizations = useMemo(() => {
    const visible = showInactive
      ? organizations
      : organizations.filter((org) => org.status === "organization.status.active");

    return [...visible].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }, [organizations, showInactive]);

  const handlePress = (org: Organization) => {
    navigation.navigate("OrganizationDetail", { organizationId: org.id });
  };

  const handleAdd = () => {
    navigation.navigate("OrganizationForm", {});
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View ref={menuAnchorRef} style={styles.headerMenuWrapper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Organization list options"
            onPress={() => setMenuVisible((current) => !current)}
            style={styles.headerButton}
          >
            <Text style={styles.headerButtonText}>⋮</Text>
          </Pressable>
        </View>
      ),
    });
  }, [navigation]);

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
    <>
      <ListScreenLayout
        data={filteredOrganizations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        emptyTitle="No organizations yet"
        emptyHint={
          showInactive ? "Tap the + button to create one" : "Tap ⋮ to include inactive"
        }
        onAdd={handleAdd}
      />
      <HeaderMenu
        anchorRef={menuAnchorRef}
        visible={menuVisible}
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setShowInactive((current) => !current);
            setMenuVisible(false);
          }}
          style={styles.menuItem}
        >
          <Text style={styles.menuItemText}>
            {showInactive ? "Hide inactive" : "Include inactive"}
          </Text>
        </Pressable>
      </HeaderMenu>
    </>
  );
};

const styles = StyleSheet.create({
  headerMenuWrapper: {
    position: "relative",
    alignItems: "flex-end",
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerButtonText: {
    fontSize: 18,
    color: colors.headerTint,
  },
  menuItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  menuItemText: {
    color: colors.textPrimary,
    fontSize: 14,
  },
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
