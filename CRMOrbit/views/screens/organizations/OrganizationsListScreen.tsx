import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLayoutEffect } from "react";

import type { OrganizationsStackScreenProps } from "@views/navigation/types";
import { useOrganizations } from "@views/store/store";
import type { Organization } from "@domains/organization";
import {
  HeaderMenu,
  ListCard,
  ListScreenLayout,
  StatusBadge,
} from "@views/components";
import { useHeaderMenu, useInactiveFilter, useTheme } from "@views/hooks";
import { t } from "@i18n/index";
type Props = OrganizationsStackScreenProps<"OrganizationsList">;

export const OrganizationsListScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const organizations = useOrganizations();
  const { menuVisible, menuAnchorRef, closeMenu, headerRight } = useHeaderMenu({
    accessibilityLabel: "Organization list options",
  });

  const {
    filteredItems: filteredOrganizations,
    menuLabel,
    emptyHint,
    toggleShowInactive,
  } = useInactiveFilter({
    items: organizations,
    isActive: (org) => org.status === "organization.status.active",
    sort: (a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    menuLabels: {
      showInactive: t("organizations.menuIncludeInactive"),
      hideInactive: t("organizations.menuHideInactive"),
    },
    emptyHint: {
      whenShowingInactive: t("organizations.emptyHint"),
      whenHidingInactive: t("organizations.includeInactiveHint"),
    },
  });

  const handlePress = (org: Organization) => {
    navigation.navigate("OrganizationDetail", { organizationId: org.id });
  };

  const handleAdd = () => {
    navigation.navigate("OrganizationForm", {});
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight,
    });
  }, [navigation, headerRight]);

  const renderItem = ({ item }: { item: Organization }) => (
    <ListCard onPress={() => handlePress(item)} style={styles.cardRow}>
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={[styles.itemName, { color: colors.textPrimary }]}>
            {item.name}
          </Text>
          <StatusBadge
            isActive={item.status === "organization.status.active"}
            activeLabelKey="status.active"
            inactiveLabelKey="status.inactive"
          />
        </View>
      </View>
    </ListCard>
  );

  return (
    <>
      <ListScreenLayout
        data={filteredOrganizations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        emptyTitle={t("organizations.emptyTitle")}
        emptyHint={emptyHint}
        onAdd={handleAdd}
      />
      <HeaderMenu
        anchorRef={menuAnchorRef}
        visible={menuVisible}
        onRequestClose={closeMenu}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            toggleShowInactive();
            closeMenu();
          }}
          style={styles.menuItem}
        >
          <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>
            {menuLabel}
          </Text>
        </Pressable>
      </HeaderMenu>
    </>
  );
};

const styles = StyleSheet.create({
  menuItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  menuItemText: {
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
    flex: 1,
  },
});
