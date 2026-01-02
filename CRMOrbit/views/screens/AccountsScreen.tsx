import { StyleSheet, Text } from "react-native";

import { PrimaryActionButton, Section } from "@views/components";
import { useAccountActions } from "@views/hooks";
import { useAccounts, useOrganizations } from "@views/store/store";

const DEVICE_ID = "device-local";

export const AccountsScreen = () => {
  const organizations = useOrganizations();
  const accounts = useAccounts();
  const { createAccount } = useAccountActions(DEVICE_ID);

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
        <Text style={styles.hint}>Add an organization first.</Text>
      ) : null}
      {accounts.length === 0 ? (
        <Text style={styles.empty}>No accounts yet.</Text>
      ) : (
        accounts.map((account) => (
          <Text key={account.id} style={styles.item}>
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
    color: "#2a2a2a",
  },
  empty: {
    fontSize: 13,
    color: "#7a7a7a",
    fontStyle: "italic",
  },
  hint: {
    fontSize: 12,
    color: "#8a6f00",
    marginBottom: 8,
  },
});
