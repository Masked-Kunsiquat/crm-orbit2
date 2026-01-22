import { useMemo } from "react";

import type { CalendarEvent } from "@domains/calendarEvent";
import { t } from "@i18n/index";
import { ListRow, ListScreenLayout, StatusBadge } from "../../components";
import { useAccounts, useAllAudits } from "../../store/store";
import {
  getAuditStartTimestamp,
  getAuditEndTimestamp,
  getAuditStatusTone,
  getAuditTimestampLabelKey,
  formatAuditScore,
  resolveAuditStatus,
  sortAuditsByDescendingTime,
  getAuditAccountId,
  getAuditFloorsVisited,
  getAuditNotes,
  getAuditScore,
} from "../../utils/audits";
import type { EventsStackScreenProps } from "../../navigation/types";

type Props = EventsStackScreenProps<"AuditsList">;

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

  const handlePress = (audit: CalendarEvent) => {
    navigation.navigate("AuditDetail", { auditId: audit.id });
  };

  const handleAdd = () => {
    navigation.navigate("AuditForm", {});
  };

  const renderItem = ({ item }: { item: CalendarEvent }) => {
    const accountId = getAuditAccountId(item);
    const accountName = accountId
      ? (accountNames.get(accountId) ?? t("common.unknownEntity"))
      : t("common.unknownEntity");
    const status = resolveAuditStatus(item);
    const timestampLabel = t(getAuditTimestampLabelKey(status));
    const timestampValue = formatTimestamp(getAuditStartTimestamp(item));
    const endTimestamp = getAuditEndTimestamp(item);
    const endTimestampValue = endTimestamp
      ? formatTimestamp(endTimestamp)
      : undefined;
    const scoreValue = formatAuditScore(getAuditScore(item));
    const scoreLabel = scoreValue
      ? `${t("audits.fields.score")}: ${scoreValue}`
      : undefined;
    const floorsVisited = getAuditFloorsVisited(item);
    const floorsLabel =
      floorsVisited && floorsVisited.length > 0
        ? `${t("audits.fields.floorsVisited")}: ${floorsVisited.join(", ")}`
        : undefined;
    const notes = getAuditNotes(item);
    const footnote = notes?.trim() ?? floorsLabel;
    const subtitle = `${timestampLabel}: ${timestampValue}`;
    const descriptionLines = [
      endTimestampValue
        ? `${t("audits.fields.endsAt")}: ${endTimestampValue}`
        : undefined,
      scoreLabel,
    ].filter(Boolean);
    const description = descriptionLines.length
      ? descriptionLines.join("\n")
      : undefined;

    return (
      <ListRow
        onPress={() => handlePress(item)}
        title={accountName}
        subtitle={subtitle}
        description={description}
        footnote={footnote}
        descriptionNumberOfLines={3}
        footnoteNumberOfLines={2}
        titleAccessory={
          <StatusBadge tone={getAuditStatusTone(status)} labelKey={status} />
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
