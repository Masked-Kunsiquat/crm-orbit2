import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { Account } from "@domains/account";
import type { AccountContact } from "@domains/relations/accountContact";
import { t } from "@i18n/index";
import { useTheme } from "../hooks";
import { Section } from "./Section";

const PREVIEW_LIMIT = 3;

export interface ContactAccountsSectionProps {
  linkedAccounts: Account[];
  accountContactRelations: Record<string, AccountContact>;
  contactId: string;
  onAccountPress: (accountId: string) => void;
  onLinkPress: () => void;
  onUnlinkPress: (accountId: string, accountName: string) => void;
  onViewAllPress: () => void;
}

export const ContactAccountsSection = ({
  linkedAccounts,
  accountContactRelations,
  contactId,
  onAccountPress,
  onLinkPress,
  onUnlinkPress,
  onViewAllPress,
}: ContactAccountsSectionProps) => {
  const { colors } = useTheme();

  const previewAccounts = linkedAccounts.slice(0, PREVIEW_LIMIT);
  const hasMore = linkedAccounts.length > PREVIEW_LIMIT;

  return (
    <Section>
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t("contacts.sections.linkedAccounts")} ({linkedAccounts.length})
        </Text>
        <TouchableOpacity
          style={[
            styles.iconButton,
            { backgroundColor: colors.surfaceElevated },
          ]}
          onPress={onLinkPress}
          accessibilityLabel={t("contacts.linkedAccounts.linkButton")}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons
            name="link-variant-plus"
            size={18}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {linkedAccounts.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {t("contacts.linkedAccounts.empty")}
        </Text>
      ) : (
        previewAccounts.map((account) => {
          const relation = Object.values(accountContactRelations).find(
            (r) => r.accountId === account.id && r.contactId === contactId,
          );
          return (
            <View
              key={account.id}
              style={[styles.accountItem, { borderBottomColor: colors.border }]}
            >
              <TouchableOpacity
                style={styles.accountInfo}
                onPress={() => onAccountPress(account.id)}
                accessibilityRole="button"
              >
                <Text
                  style={[styles.accountName, { color: colors.textPrimary }]}
                >
                  {account.name}
                </Text>
                {relation?.isPrimary && (
                  <View
                    style={[
                      styles.primaryBadge,
                      { backgroundColor: colors.accentMuted },
                    ]}
                  >
                    <Text
                      style={[styles.primaryText, { color: colors.accent }]}
                    >
                      {t("contacts.linkedAccounts.primaryBadge")}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.unlinkButton,
                  { backgroundColor: colors.errorBg },
                ]}
                onPress={() => onUnlinkPress(account.id, account.name)}
                accessibilityLabel={t("contacts.unlinkAction")}
                accessibilityRole="button"
              >
                <MaterialCommunityIcons
                  name="link-variant-minus"
                  size={18}
                  color={colors.error}
                />
              </TouchableOpacity>
            </View>
          );
        })
      )}

      {hasMore ? (
        <TouchableOpacity
          style={[styles.viewAllButton, { borderColor: colors.border }]}
          onPress={onViewAllPress}
        >
          <Text style={[styles.viewAllText, { color: colors.accent }]}>
            {t("common.viewAll")}
          </Text>
        </TouchableOpacity>
      ) : null}
    </Section>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  accountItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  accountInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  accountName: {
    fontSize: 15,
    fontWeight: "500",
  },
  primaryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  unlinkButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
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
