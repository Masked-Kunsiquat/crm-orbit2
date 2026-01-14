import { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons, FontAwesome6 } from "@expo/vector-icons";

import { useAllCalendarEvents, useAccounts } from "../../store/store";
import type { CalendarEvent } from "../../../domains/calendarEvent";
import { ListRow, ListScreenLayout, StatusBadge } from "../../components";
import { t } from "@i18n/index";
import { useTheme } from "../../hooks";
import { formatDurationLabel } from "../../utils/duration";
import type { EventsStackScreenProps } from "../../navigation/types";

type Props = EventsStackScreenProps<"CalendarEventsList">;

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

const getStatusTone = (status: string): "success" | "warning" | "danger" => {
  if (status === "calendarEvent.status.completed") {
    return "success";
  }
  if (status === "calendarEvent.status.canceled") {
    return "danger";
  }
  return "warning";
};

export const CalendarEventsListScreen = ({ navigation }: Props) => {
  const calendarEvents = useAllCalendarEvents();
  const accounts = useAccounts();
  const { colors } = useTheme();

  const accountNames = useMemo(() => {
    return new Map(accounts.map((account) => [account.id, account.name]));
  }, [accounts]);

  const sortedEvents = useMemo(() => {
    return [...calendarEvents].sort((a, b) => {
      // Sort by scheduledFor descending (most recent first)
      return (
        new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime()
      );
    });
  }, [calendarEvents]);

  const handlePress = (event: CalendarEvent) => {
    navigation.navigate("CalendarEventDetail", {
      calendarEventId: event.id,
    });
  };

  const handleAdd = () => {
    navigation.navigate("CalendarEventForm", {});
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "calendarEvent.type.email":
        return <Ionicons name="mail-outline" size={20} color={colors.accent} />;
      case "calendarEvent.type.call":
        return <Ionicons name="call-outline" size={20} color={colors.accent} />;
      case "calendarEvent.type.meeting":
        return (
          <Ionicons
            name="people-circle-outline"
            size={20}
            color={colors.accent}
          />
        );
      case "calendarEvent.type.audit":
        return (
          <Ionicons name="clipboard-outline" size={20} color={colors.accent} />
        );
      case "calendarEvent.type.task":
        return (
          <Ionicons
            name="checkmark-circle-outline"
            size={20}
            color={colors.accent}
          />
        );
      case "calendarEvent.type.reminder":
        return (
          <Ionicons name="alarm-outline" size={20} color={colors.accent} />
        );
      case "calendarEvent.type.other":
      default:
        return (
          <FontAwesome6 name="lines-leaning" size={20} color={colors.accent} />
        );
    }
  };

  const renderItem = ({ item }: { item: CalendarEvent }) => {
    const isCompleted = item.status === "calendarEvent.status.completed";
    const timestampValue = isCompleted
      ? (item.occurredAt ?? item.scheduledFor)
      : item.scheduledFor;
    const timestampLabel = isCompleted
      ? t("calendarEvents.occurredAt")
      : t("calendarEvents.scheduledFor");
    const formattedTimestamp = formatTimestamp(timestampValue);

    // Build title based on type
    let title = item.summary;
    if (item.type === "calendarEvent.type.audit" && item.auditData?.accountId) {
      const accountName =
        accountNames.get(item.auditData.accountId) ?? t("common.unknownEntity");
      title = accountName;
    }

    // Build subtitle
    const subtitle = `${t(item.type)} · ${timestampLabel}: ${formattedTimestamp}`;

    // Build description lines
    const descriptionLines: string[] = [];
    if (item.durationMinutes) {
      descriptionLines.push(
        `${t("calendarEvents.fields.duration")}: ${formatDurationLabel(item.durationMinutes)}`,
      );
    }
    if (
      item.type === "calendarEvent.type.audit" &&
      item.auditData?.score !== undefined
    ) {
      descriptionLines.push(
        `${t("calendarEvents.fields.score")}: ${item.auditData.score}%`,
      );
    }
    if (item.location) {
      descriptionLines.push(
        `${t("calendarEvents.fields.location")}: ${item.location}`,
      );
    }
    const description =
      descriptionLines.length > 0 ? descriptionLines.join("\n") : undefined;

    // Footnote: description or floors visited
    let footnote: string | undefined;
    if (item.type !== "calendarEvent.type.audit") {
      footnote = item.description?.trim();
    } else if (
      item.auditData?.floorsVisited &&
      item.auditData.floorsVisited.length > 0
    ) {
      footnote = `${t("calendarEvents.fields.floorsVisited")}: ${item.auditData.floorsVisited.join(", ")}`;
    }

    return (
      <ListRow
        onPress={() => handlePress(item)}
        title={title}
        subtitle={subtitle}
        description={description}
        footnote={footnote}
        descriptionNumberOfLines={3}
        footnoteNumberOfLines={2}
        titleAccessory={
          <StatusBadge
            tone={getStatusTone(item.status)}
            labelKey={item.status}
          />
        }
        style={styles.listRow}
      >
        <View style={styles.iconContainer}>{getEventIcon(item.type)}</View>
      </ListRow>
    );
  };

  return (
    <ListScreenLayout
      data={sortedEvents}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      emptyTitle={t("calendarEvents.emptyTitle")}
      emptyHint={t("calendarEvents.emptyHint")}
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
