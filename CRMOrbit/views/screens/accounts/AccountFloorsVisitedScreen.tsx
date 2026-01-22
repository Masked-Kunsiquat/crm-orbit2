import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { AccountsStackScreenProps } from "../../navigation/types";
import {
  useAccount,
  useAccountFloorsVisitedLabels,
  useAuditsByAccount,
} from "../../store/store";
import {
  DetailScreenLayout,
  FloorsVisitedMatrix,
  Section,
  SegmentedOptionGroup,
  buildFloorsVisitedMatrix,
} from "../../components";
import { useTheme } from "../../hooks";
import { t } from "@i18n/index";

type DateRangeFilter = "3m" | "6m" | "12m" | "all";

const DATE_RANGE_OPTIONS: ReadonlyArray<{
  value: DateRangeFilter;
  label: string;
}> = [
  { value: "3m", label: "3 mo" },
  { value: "6m", label: "6 mo" },
  { value: "12m", label: "12 mo" },
  { value: "all", label: "All" },
];

const getMaxVisitsForRange = (filter: DateRangeFilter): number | undefined => {
  switch (filter) {
    case "3m":
      return 3;
    case "6m":
      return 6;
    case "12m":
      return 12;
    case "all":
      return undefined;
  }
};

type Props = AccountsStackScreenProps<"AccountFloorsVisited">;

export const AccountFloorsVisitedScreen = ({ route }: Props) => {
  const { accountId } = route.params;
  const account = useAccount(accountId);
  const audits = useAuditsByAccount(accountId);
  const { colors } = useTheme();
  const { notFoundKey, floorsVisitedTitleKey, emptyTitleKey } =
    useAccountFloorsVisitedLabels();
  const [dateRange, setDateRange] = useState<DateRangeFilter>("6m");

  const floorsMatrix = useMemo(() => {
    if (!account) {
      return null;
    }
    return buildFloorsVisitedMatrix({
      audits,
      account,
      maxVisits: getMaxVisitsForRange(dateRange),
    });
  }, [account, audits, dateRange]);

  if (!account) {
    return (
      <DetailScreenLayout>
        <Text style={[styles.errorText, { color: colors.error }]}>
          {t(notFoundKey)}
        </Text>
      </DetailScreenLayout>
    );
  }

  return (
    <DetailScreenLayout>
      <Section title={t(floorsVisitedTitleKey)}>
        <View style={styles.header}>
          <Text style={[styles.accountName, { color: colors.textPrimary }]}>
            {account.name}
          </Text>
          <SegmentedOptionGroup
            options={DATE_RANGE_OPTIONS}
            value={dateRange}
            onChange={setDateRange}
          />
        </View>
        {floorsMatrix ? (
          <FloorsVisitedMatrix data={floorsMatrix} variant="full" />
        ) : (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t(emptyTitleKey)}
          </Text>
        )}
      </Section>
    </DetailScreenLayout>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: 12,
    gap: 12,
  },
  accountName: {
    fontSize: 16,
    fontWeight: "600",
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
