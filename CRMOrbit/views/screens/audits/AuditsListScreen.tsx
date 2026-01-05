import { useMemo } from "react";

import type { Audit } from "@domains/audit";
import { t } from "@i18n/index";
import { ListRow, ListScreenLayout, StatusBadge } from "../../components";
import { useAccounts, useAllAudits } from "../../store/store";
import { sortAuditsByDescendingTime } from "../../utils/audits";

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
};

const formatTimestamp = (timestamp?: string): string => {
  if (!timestamp) {
    return t("common.unknown");
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return t("common.unknown");
  }
  return date.toLocaleString();
};

export const AuditsListScreen = ({ navigation }: Props) => {
  const audits = useAllAudits();
  const accounts = useAccounts();

  const accountNames = useMemo(() => {
    return new Map(accounts.map((account) => [account.id, account.name]));
  }, [accounts]);

  const sortedAudits = useMemo(() => {
    return [...audits].sort(sortAuditsByDescendingTime);
  }, [audits]);

  const handlePress = (audit: Audit) => {
    navigation.navigate("AuditDetail", { auditId: audit.id });
  };

  const handleAdd = () => {
    navigation.navigate("AuditForm", {});
  };

  const renderItem = ({ item }: { item: Audit }) => {
    const accountName =
      accountNames.get(item.accountId) ?? t("common.unknownEntity");
    const isCompleted = Boolean(item.occurredAt);
    const timestampLabel = isCompleted
      ? t("audits.fields.occurredAt")
      : t("audits.fields.scheduledFor");
    const timestampValue = formatTimestamp(
      item.occurredAt ?? item.scheduledFor,
    );
    const scoreLabel =
      item.score !== undefined
        ? `${t("audits.fields.score")}: ${item.score}`
        : undefined;
    const floorsLabel =
      item.floorsVisited && item.floorsVisited.length > 0
        ? `${t("audits.fields.floorsVisited")}: ${item.floorsVisited.join(", ")}`
        : undefined;
    const footnote = item.notes?.trim() || floorsLabel;
    const subtitle = scoreLabel ?? (item.notes ? floorsLabel : undefined);

    return (
      <ListRow
        onPress={() => handlePress(item)}
        title={accountName}
        description={`${timestampLabel}: ${timestampValue}`}
        footnote={footnote}
        descriptionNumberOfLines={2}
        footnoteNumberOfLines={2}
        subtitle={subtitle}
        titleAccessory={
          <StatusBadge
            isActive={isCompleted}
            activeLabelKey="audits.status.completed"
            inactiveLabelKey="audits.status.scheduled"
          />
        }
      />
    );
  };

  return (
    <ListScreenLayout
      data={sortedAudits}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      emptyTitle={t("audits.emptyTitle")}
      emptyHint={t("audits.emptyHint")}
      onAdd={handleAdd}
    />
  );
};
