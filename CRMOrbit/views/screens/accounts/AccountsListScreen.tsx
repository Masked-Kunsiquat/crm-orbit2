import { Pressable, StyleSheet, Text } from "react-native";
import { useLayoutEffect } from "react";

import type { AccountsStackScreenProps } from "../../navigation/types";
import { useAccounts, useOrganizations } from "../../store/store";
import type { Account } from "../../../domains/account";
import { t } from "@i18n/index";
import {
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
