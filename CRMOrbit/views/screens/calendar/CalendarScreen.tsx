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
import type { MiscStackScreenProps } from "../../navigation/types";

type Props = MiscStackScreenProps<"Calendar">;

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
      timestamp: resolveTimestamp(audit.occurredAt ?? audit.scheduledFor),
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
      const isCompleted = Boolean(audit.occurredAt);
      const timestampLabel = isCompleted
        ? t("audits.fields.occurredAt")
        : t("audits.fields.scheduledFor");
      const timestampValue = formatTimestamp(
        audit.occurredAt ?? audit.scheduledFor,
      );
      const scoreLabel =
        audit.score !== undefined
          ? `${t("audits.fields.score")}: ${audit.score}`
          : undefined;
      const floorsLabel =
        audit.floorsVisited && audit.floorsVisited.length > 0
          ? `${t("audits.fields.floorsVisited")}: ${audit.floorsVisited.join(
              ", ",
            )}`
          : undefined;
      const footnote = audit.notes?.trim() || floorsLabel;
      const subtitle = scoreLabel ?? (audit.notes ? floorsLabel : undefined);

      return (
        <ListRow
          onPress={() =>
            navigation.navigate("AuditDetail", { auditId: audit.id })
          }
          title={accountName}
          description={`${timestampLabel}: ${timestampValue}`}
          footnote={footnote}
          subtitle={subtitle}
          descriptionNumberOfLines={2}
          footnoteNumberOfLines={2}
          style={styles.listRow}
          titleAccessory={
            <StatusBadge
              isActive={isCompleted}
              activeLabelKey="audits.status.completed"
              inactiveLabelKey="audits.status.scheduled"
            />
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
    const description =
      resolvedStatus === "interaction.status.completed"
        ? `${t(labelKey)}: ${formattedTimestamp}`
        : `${t("interactions.statusLabel")}: ${t(resolvedStatus)} · ${t(
            labelKey,
          )}: ${formattedTimestamp}`;

    return (
      <ListRow
        onPress={() =>
          navigation.navigate("InteractionDetail", {
            interactionId: interaction.id,
          })
        }
        title={interaction.summary}
        description={description}
        descriptionNumberOfLines={2}
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
        item.kind === "audit" ? `audit-${item.audit.id}` : `interaction-${item.interaction.id}`
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
