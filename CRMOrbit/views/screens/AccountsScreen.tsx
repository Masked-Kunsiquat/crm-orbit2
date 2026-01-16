import { StyleSheet, Text } from "react-native";

import { PrimaryActionButton, Section } from "@views/components";
import { useAccountActions, useDeviceId, useTheme } from "@views/hooks";
import { useAccounts, useOrganizations } from "@views/store/store";
import { t } from "@i18n/index";

export const AccountsScreen = () => {
  const organizations = useOrganizations();
  const accounts = useAccounts();
  const deviceId = useDeviceId();
  const { createAccount } = useAccountActions(deviceId);
  const { colors } = useTheme();

  const handleAddAccount = () => {
    const organization = organizations[0];
    if (!organization) {
      return;
    }

    // Use timestamp-based identifier (locale-neutral)
    // In production, this would prompt the user for a name
    createAccount(
      organization.id,
      `acct-${Date.now()}`,
      "account.status.active",
    );
  };

  return (
    <Section title="Accounts">
      <PrimaryActionButton
        label="Add account"
        onPress={handleAddAccount}
        disabled={organizations.length === 0}
      />
      {organizations.length === 0 ? (
        <Text style={[styles.hint, { color: colors.warning }]}>
          {t("accounts.emptyOrganizationHint")}
        </Text>
      ) : null}
      {accounts.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>
          {t("accounts.emptyTitle")}
        </Text>
      ) : (
        accounts.map((account) => (
          <Text
            key={account.id}
            style={[styles.item, { color: colors.textPrimary }]}
          >
            {account.name} (org {account.organizationId})
          </Text>
        ))
      )}
    </Section>
  );
};

const styles = StyleSheet.create({
  item: {
    fontSize: 14,
    marginBottom: 6,
  },
  empty: {
    fontSize: 13,
    fontStyle: "italic",
  },
  hint: {
    fontSize: 12,
    marginBottom: 8,
  },
});
