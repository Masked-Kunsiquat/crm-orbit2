import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { Account } from "@domains/account";
import { useTheme } from "../hooks";
import { Section } from "./Section";

const PREVIEW_LIMIT = 3;

export interface OrganizationAccountsSectionProps {
  accounts: Account[];
  labels: {
    title: string;
    emptyStateText: string;
    addAccountLabel: string;
    manageAccountLabel: string;
    viewAllLabel: string;
  };
  onAccountPress: (accountId: string) => void;
  onCreatePress: () => void;
  onLinkPress: () => void;
  onViewAllPress: () => void;
}

export const OrganizationAccountsSection = ({
  accounts,
  labels,
  onAccountPress,
  onCreatePress,
  onLinkPress,
  onViewAllPress,
}: OrganizationAccountsSectionProps) => {
  const { colors } = useTheme();

  const previewAccounts = accounts.slice(0, PREVIEW_LIMIT);
  const hasMore = accounts.length > PREVIEW_LIMIT;

  return (
    <Section>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {labels.title} ({accounts.length})
        </Text>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.accent }]}
            onPress={onCreatePress}
            accessibilityLabel={labels.addAccountLabel}
          >
            <MaterialCommunityIcons
              name="plus"
              size={18}
              color={colors.onAccent}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.iconButton,
              styles.iconButtonSecondary,
              { backgroundColor: colors.surfaceElevated },
            ]}
            onPress={onLinkPress}
            accessibilityLabel={labels.manageAccountLabel}
          >
            <MaterialCommunityIcons
              name="link-variant-plus"
              size={18}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
        </View>
      </View>
      {accounts.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {labels.emptyStateText}
        </Text>
      ) : (
        previewAccounts.map((account) => (
          <TouchableOpacity
            key={account.id}
            style={[styles.relatedItem, { borderTopColor: colors.borderLight }]}
            onPress={() => onAccountPress(account.id)}
            accessibilityRole="button"
          >
            <View
              style={[
                styles.statusIndicator,
                account.status === "account.status.active"
                  ? { backgroundColor: colors.success }
                  : { backgroundColor: colors.error },
              ]}
            />
            <Text style={[styles.relatedName, { color: colors.textPrimary }]}>
              {account.name}
            </Text>
          </TouchableOpacity>
        ))
      )}
      {hasMore ? (
        <TouchableOpacity
          style={[styles.viewAllButton, { borderColor: colors.border }]}
          onPress={onViewAllPress}
        >
          <Text style={[styles.viewAllText, { color: colors.accent }]}>
            {labels.viewAllLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </Section>
  );
};

const styles = StyleSheet.create({
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonSecondary: {
    marginLeft: 8,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  relatedItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  relatedName: {
    fontSize: 15,
    fontWeight: "500",
  },
  viewAllButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    marginTop: 12,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
