import { useMemo } from "react";
import { StyleSheet, Text } from "react-native";

import type { AccountsStackScreenProps } from "../../navigation/types";
import { useAccount, useAuditsByAccount } from "../../store/store";
import { t } from "@i18n/index";
import {
  DetailScreenLayout,
  FloorsVisitedMatrix,
  Section,
  buildFloorsVisitedMatrix,
} from "../../components";
import { useTheme } from "../../hooks";

type Props = AccountsStackScreenProps<"AccountFloorsVisited">;

export const AccountFloorsVisitedScreen = ({ route }: Props) => {
  const { accountId } = route.params;
  const account = useAccount(accountId);
  const audits = useAuditsByAccount(accountId);
  const { colors } = useTheme();

  if (!account) {
    return (
      <DetailScreenLayout>
        <Text style={[styles.errorText, { color: colors.error }]}>
          {t("accounts.notFound")}
        </Text>
      </DetailScreenLayout>
    );
  }

  const floorsMatrix = useMemo(
    () =>
      buildFloorsVisitedMatrix({
        audits,
        account,
      }),
    [account, audits],
  );

  return (
    <DetailScreenLayout>
      <Section title={t("audits.fields.floorsVisited")}>
        <Text style={[styles.accountName, { color: colors.textPrimary }]}>
          {account.name}
        </Text>
        {floorsMatrix ? (
          <FloorsVisitedMatrix data={floorsMatrix} variant="full" />
        ) : (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t("audits.emptyTitle")}
          </Text>
        )}
      </Section>
    </DetailScreenLayout>
  );
};

const styles = StyleSheet.create({
  accountName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
  },
  errorText: {
    fontSize: 16,
    padding: 16,
  },
});
