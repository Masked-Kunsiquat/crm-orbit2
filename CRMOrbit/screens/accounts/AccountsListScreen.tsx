import { StyleSheet, Text, View } from "react-native";

import type { AccountsStackScreenProps } from "../../navigation/types";
import { useAccounts, useOrganizations } from "../../crm-core/views/store";
import type { Account } from "../../crm-core/domains/account";
import { t } from "../../i18n";
import { ListCard, ListScreenLayout, StatusBadge } from "../../components";
import { colors } from "../../theme/colors";

type Props = AccountsStackScreenProps<"AccountsList">;

export const AccountsListScreen = ({ navigation }: Props) => {
  const accounts = useAccounts();
  const organizations = useOrganizations();

  const getOrganizationName = (organizationId: string) => {
    const org = organizations.find((o) => o.id === organizationId);
    return org?.name ?? "Unknown";
  };

  const handlePress = (account: Account) => {
    navigation.navigate("AccountDetail", { accountId: account.id });
  };

  const handleCreate = () => {
    navigation.navigate("AccountForm", {});
  };

  return (
    <ListScreenLayout
      data={accounts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ListCard onPress={() => handlePress(item)} variant="outlined">
          <View style={styles.cardHeader}>
            <Text style={styles.name}>{item.name}</Text>
            <StatusBadge
              isActive={item.status === "account.status.active"}
              activeLabel="Active"
              inactiveLabel="Inactive"
            />
          </View>
          <Text style={styles.organization}>{getOrganizationName(item.organizationId)}</Text>
        </ListCard>
      )}
      emptyTitle={t("accounts.emptyTitle")}
      emptyHint={t("accounts.emptyHint")}
      onAdd={handleCreate}
    />
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
    color: colors.textPrimary,
    flex: 1,
  },
  organization: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
