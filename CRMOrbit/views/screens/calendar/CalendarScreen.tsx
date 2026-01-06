import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { AntDesign, FontAwesome6, Ionicons } from "@expo/vector-icons";

import type { Audit } from "@domains/audit";
import type { Interaction } from "@domains/interaction";
import { t } from "@i18n/index";
import {
  ListRow,
  ListScreenLayout,
  StatusBadge,
} from "../../components";
import { useTheme } from "../../hooks";
import { useAccounts, useAllAudits, useAllInteractions } from "../../store/store";
import type { EventsStackScreenProps } from "../../navigation/types";
import {
  getAuditEndTimestamp,
  getAuditStartTimestamp,
  getAuditStatusTone,
  getAuditTimestampLabelKey,
  formatAuditScore,
  resolveAuditStatus,
} from "../../utils/audits";
import { addMinutesToTimestamp } from "../../utils/duration";

type Props = EventsStackScreenProps<"Calendar">;

type CalendarItem =
  | { kind: "audit"; timestamp: number; audit: Audit }
  | { kind: "interaction"; timestamp: number; interaction: Interaction };

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

const resolveTimestamp = (timestamp?: string): number => {
  if (!timestamp) {
    return Number.NEGATIVE_INFINITY;
  }
  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
};

export const CalendarScreen = ({ navigation }: Props) => {
  const audits = useAllAudits();
  const interactions = useAllInteractions();
  const accounts = useAccounts();
  const { colors } = useTheme();

  const accountNames = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts],
  );

  const items = useMemo<CalendarItem[]>(() => {
    const auditItems = audits.map((audit) => ({
      kind: "audit" as const,
      timestamp: resolveTimestamp(getAuditStartTimestamp(audit)),
      audit,
    }));
    const interactionItems = interactions.map((interaction) => ({
      kind: "interaction" as const,
      timestamp: resolveTimestamp(
        interaction.scheduledFor ?? interaction.occurredAt,
      ),
      interaction,
    }));
    return [...auditItems, ...interactionItems].sort(
      (left, right) => right.timestamp - left.timestamp,
    );
  }, [audits, interactions]);

  const handleAdd = () => {
    navigation.navigate("InteractionForm", {});
  };

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case "interaction.type.email":
        return <Ionicons name="mail-outline" size={20} color={colors.accent} />;
      case "interaction.type.call":
        return <Ionicons name="call-outline" size={20} color={colors.accent} />;
      case "interaction.type.meeting":
        return (
          <Ionicons
            name="people-circle-outline"
            size={20}
            color={colors.accent}
          />
        );
      case "interaction.type.other":
      default:
        return (
          <FontAwesome6 name="lines-leaning" size={20} color={colors.accent} />
        );
    }
  };

  const renderItem = ({ item }: { item: CalendarItem }) => {
    if (item.kind === "audit") {
      const audit = item.audit;
      const accountName =
        accountNames.get(audit.accountId) ?? t("common.unknownEntity");
      const status = resolveAuditStatus(audit);
      const timestampLabel = t(getAuditTimestampLabelKey(status));
      const startTimestamp = getAuditStartTimestamp(audit);
      const endTimestamp = getAuditEndTimestamp(audit);
      const timestampValue = formatTimestamp(startTimestamp);
      const endTimestampValue = endTimestamp
        ? formatTimestamp(endTimestamp)
        : undefined;
      const scoreValue = formatAuditScore(audit.score);
      const scoreLabel = scoreValue
        ? `${t("audits.fields.score")}: ${scoreValue}`
        : undefined;
      const floorsLabel =
        audit.floorsVisited && audit.floorsVisited.length > 0
          ? `${t("audits.fields.floorsVisited")}: ${audit.floorsVisited.join(
              ", ",
            )}`
          : undefined;
      const footnote = audit.notes?.trim() || floorsLabel;
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
          onPress={() =>
            navigation.navigate("AuditDetail", { auditId: audit.id })
          }
          title={accountName}
          subtitle={subtitle}
          description={description}
          footnote={footnote}
          descriptionNumberOfLines={3}
          footnoteNumberOfLines={2}
          style={styles.listRow}
          titleAccessory={
            <StatusBadge tone={getAuditStatusTone(status)} labelKey={status} />
          }
        >
          <View style={styles.iconContainer}>
            <AntDesign name="audit" size={20} color={colors.accent} />
          </View>
        </ListRow>
      );
    }

    const interaction = item.interaction;
    const resolvedStatus = interaction.status ?? "interaction.status.completed";
    const usesScheduledTimestamp =
      resolvedStatus !== "interaction.status.completed";
    const timestampValue = usesScheduledTimestamp
      ? (interaction.scheduledFor ?? interaction.occurredAt)
      : interaction.occurredAt;
    const labelKey = usesScheduledTimestamp
      ? "interactions.scheduledFor"
      : "interactions.occurredAt";
    const formattedTimestamp = formatTimestamp(timestampValue);
    const subtitle = `${t(labelKey)}: ${formattedTimestamp}`;
    const endTimestamp = addMinutesToTimestamp(
      timestampValue,
      interaction.durationMinutes,
    );
    const endTimestampValue = endTimestamp
      ? formatTimestamp(endTimestamp)
      : undefined;
    const descriptionLines = [
      resolvedStatus !== "interaction.status.completed"
        ? `${t("interactions.statusLabel")}: ${t(resolvedStatus)}`
        : undefined,
      endTimestampValue
        ? `${t("interactions.fields.endsAt")}: ${endTimestampValue}`
        : undefined,
    ].filter(Boolean);
    const interactionDescription = descriptionLines.length
      ? descriptionLines.join("\n")
      : undefined;

    return (
      <ListRow
        onPress={() =>
          navigation.navigate("InteractionDetail", {
            interactionId: interaction.id,
          })
        }
        title={interaction.summary}
        subtitle={subtitle}
        description={interactionDescription}
        descriptionNumberOfLines={3}
        style={styles.listRow}
      >
        <View style={styles.iconContainer}>
          {getInteractionIcon(interaction.type)}
        </View>
      </ListRow>
    );
  };

  return (
    <ListScreenLayout
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) =>
        item.kind === "audit"
          ? `audit-${item.audit.id}`
          : `interaction-${item.interaction.id}`
      }
      emptyTitle={t("calendar.emptyTitle")}
      emptyHint={t("calendar.emptyHint")}
      onAdd={handleAdd}
    />
  );
};

const styles = StyleSheet.create({
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconContainer: {
    marginLeft: 8,
  },
});
