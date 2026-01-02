import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLayoutEffect, useMemo, useState } from "react";

import type { AccountsStackScreenProps } from "../../navigation/types";
import { useAccounts, useOrganizations } from "../../store/store";
import type { Account } from "../../../domains/account";
import { t } from "@i18n/index";
import {
  HeaderMenu,
  ListCard,
  ListScreenLayout,
  StatusBadge,
} from "../../components";
import { useHeaderMenu, useTheme } from "../../hooks";

type Props = AccountsStackScreenProps<"AccountsList">;

export const AccountsListScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const accounts = useAccounts();
  const organizations = useOrganizations();
  const [showInactive, setShowInactive] = useState(false);
  const { menuVisible, menuAnchorRef, closeMenu, headerRight } = useHeaderMenu({
    accessibilityLabel: t("accounts.listOptions"),
  });

  const filteredAccounts = useMemo(() => {
    const visible = showInactive
      ? accounts
      : accounts.filter(
          (account) => account.status === "account.status.active",
        );

    return [...visible].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }, [accounts, showInactive]);

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
          <ListCard onPress={() => handlePress(item)} variant="outlined">
            <View style={styles.cardHeader}>
              <Text style={[styles.name, { color: colors.textPrimary }]}>
                {item.name}
              </Text>
              <StatusBadge
                isActive={item.status === "account.status.active"}
                activeLabelKey="status.active"
                inactiveLabelKey="status.inactive"
              />
            </View>
            <Text
              style={[styles.organization, { color: colors.textSecondary }]}
            >
              {getOrganizationName(item.organizationId)}
            </Text>
          </ListCard>
        )}
        emptyTitle={t("accounts.emptyTitle")}
        emptyHint={
          showInactive
            ? t("accounts.emptyHint")
            : t("accounts.includeInactiveHint")
        }
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
            setShowInactive((current) => !current);
            closeMenu();
          }}
          style={styles.menuItem}
        >
          <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>
            {showInactive
              ? t("accounts.menuHideInactive")
              : t("accounts.menuIncludeInactive")}
          </Text>
        </Pressable>
      </HeaderMenu>
    </>
  );
};

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  organization: {
    fontSize: 14,
  },
  menuItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  menuItemText: {
    fontSize: 14,
  },
});
