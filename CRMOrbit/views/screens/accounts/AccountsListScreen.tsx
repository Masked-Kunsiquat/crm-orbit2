import { FlatList, Pressable, StyleSheet, Text } from "react-native";
import { useLayoutEffect, useMemo, useRef } from "react";

import type { AccountsStackScreenProps } from "../../navigation/types";
import { useAccounts, useOrganizations } from "../../store/store";
import type { Account } from "../../../domains/account";
import { t } from "@i18n/index";
import {
  AlphabetScrollbar,
  HeaderMenu,
  ListRow,
  ListScreenLayout,
  StatusBadge,
} from "../../components";
import { useHeaderMenu, useInactiveFilter, useTheme } from "../../hooks";

type Props = AccountsStackScreenProps<"AccountsList">;

export const AccountsListScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const accounts = useAccounts();
  const organizations = useOrganizations();
  const flatListRef = useRef<FlatList<Account>>(null);

  const { menuVisible, menuAnchorRef, closeMenu, headerRight } = useHeaderMenu({
    accessibilityLabel: t("accounts.listOptions"),
  });

  const {
    filteredItems: filteredAccounts,
    menuLabel,
    emptyHint,
    toggleShowInactive,
  } = useInactiveFilter({
    items: accounts,
    isActive: (account) => account.status === "account.status.active",
    sort: (a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    menuLabels: {
      showInactive: t("accounts.menuIncludeInactive"),
      hideInactive: t("accounts.menuHideInactive"),
    },
    emptyHint: {
      whenShowingInactive: t("accounts.emptyHint"),
      whenHidingInactive: t("accounts.includeInactiveHint"),
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

  const getOrganizationName = (organizationId: string) => {
    const org = organizations.find((o) => o.id === organizationId);
    return org?.name ?? t("common.unknown");
  };

  const handlePress = (account: Account) => {
    navigation.navigate("AccountDetail", { accountId: account.id });
  };

  const handleCreate = () => {
    navigation.navigate("AccountForm", {});
  };

  const handleAlphabetSelect = (char: string) => {
    // Find first account starting with the selected character
    const index = filteredAccounts.findIndex((account) => {
      const firstChar = account.name.charAt(0).toUpperCase();
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

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight,
    });
  }, [navigation, headerRight]);

  return (
    <>
      <ListScreenLayout
        data={filteredAccounts}
        keyExtractor={(item) => item.id}
        flatListRef={flatListRef}
        renderItem={({ item }) => (
          <ListRow
            onPress={() => handlePress(item)}
            title={item.name}
            titleAccessory={
              <StatusBadge
                isActive={item.status === "account.status.active"}
                activeLabelKey="status.active"
                inactiveLabelKey="status.inactive"
              />
            }
            description={getOrganizationName(item.organizationId)}
            titleSpacing={8}
          />
        )}
        emptyTitle={t("accounts.emptyTitle")}
        emptyHint={emptyHint}
        onAdd={handleCreate}
        rightAccessory={
          filteredAccounts.length > 0 ? (
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
});
