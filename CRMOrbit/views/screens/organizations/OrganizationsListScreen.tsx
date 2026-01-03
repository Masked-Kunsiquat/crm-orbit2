import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useLayoutEffect, useMemo, useRef } from "react";
import { Image } from "expo-image";

import type { OrganizationsStackScreenProps } from "@views/navigation/types";
import { useOrganizations } from "@views/store/store";
import type { Organization } from "@domains/organization";
import { getOrganizationLogoUrl } from "@domains/organization.utils";
import {
  AlphabetScrollbar,
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
  const flatListRef = useRef<FlatList<Organization>>(null);

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

  // Alphabet scrollbar data: # for symbols/numbers, then A-Z
  const alphabetData = useMemo(
    () => [
      "#",
      ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)),
    ],
    [],
  );

  const handleAlphabetSelect = (char: string) => {
    const index = filteredOrganizations.findIndex((org) => {
      const firstChar = org.name.charAt(0).toUpperCase();
      if (char === "#") {
        // For #, match any non-letter (symbols, numbers)
        return !/[A-Z]/.test(firstChar);
      }
      return firstChar === char;
    });

    if (index !== -1) {
      flatListRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0,
      });
    }
  };

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

  const renderItem = ({ item }: { item: Organization }) => {
    const logoUrl = getOrganizationLogoUrl(item, 64);

    return (
      <ListCard onPress={() => handlePress(item)} style={styles.cardRow}>
        {logoUrl && (
          <Image
            source={{ uri: logoUrl }}
            style={styles.logo}
            contentFit="contain"
            transition={200}
          />
        )}
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
  };

  return (
    <>
      <ListScreenLayout
        data={filteredOrganizations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        flatListRef={flatListRef}
        emptyTitle={t("organizations.emptyTitle")}
        emptyHint={emptyHint}
        onAdd={handleAdd}
        rightAccessory={
          filteredOrganizations.length > 0 ? (
            <AlphabetScrollbar
              data={alphabetData}
              onCharSelect={handleAlphabetSelect}
            />
          ) : null
        }
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
  logo: {
    width: 40,
    height: 40,
    marginRight: 12,
    borderRadius: 8,
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
