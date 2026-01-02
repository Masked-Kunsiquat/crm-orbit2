import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

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
import { colors } from "../../../domains/shared/theme/colors";

type Props = AccountsStackScreenProps<"AccountsList">;

export const AccountsListScreen = ({ navigation }: Props) => {
  const accounts = useAccounts();
  const organizations = useOrganizations();
  const [menuVisible, setMenuVisible] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const menuAnchorRef = useRef<View>(null);

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
      headerRight: () => (
        <View ref={menuAnchorRef} style={styles.headerMenuWrapper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("accounts.listOptions")}
            onPress={() => setMenuVisible((current) => !current)}
            style={styles.headerButton}
          >
            <Text style={styles.headerButtonText}>⋮</Text>
          </Pressable>
        </View>
      ),
    });
  }, [navigation]);

  return (
    <>
      <ListScreenLayout
        data={filteredAccounts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ListCard onPress={() => handlePress(item)} variant="outlined">
            <View style={styles.cardHeader}>
              <Text style={styles.name}>{item.name}</Text>
              <StatusBadge
                isActive={item.status === "account.status.active"}
                activeLabelKey="status.active"
                inactiveLabelKey="status.inactive"
              />
            </View>
            <Text style={styles.organization}>
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    flex: 1,
  },
  organization: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  menuItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  menuItemText: {
    color: colors.textPrimary,
    fontSize: 14,
  },
});
