import React, { useCallback, useMemo } from "react";
import { StyleSheet, View, Text } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { CalendarProvider, ExpandableCalendar } from "react-native-calendars";
import type { DateData } from "react-native-calendars";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";

import type { CalendarEvent } from "@domains/calendarEvent";
import { ListRow, StatusBadge } from "./index";
import { useTheme } from "../hooks";
import { buildCalendarTheme } from "../utils/calendarTheme";
import type { CalendarEventAgendaItem } from "../utils/calendarDataTransformers";
import {
  buildCalendarEventAgendaItem,
  buildMarkedDatesFromCalendarEvents,
} from "../utils/calendarDataTransformers";
import { resolveCalendarPalette } from "../utils/calendarColors";
import {
  expandCalendarEventsInRange,
  getCalendarMonthRange,
} from "../utils/recurrence";
import { useCalendarSettings } from "../store/store";

export interface CalendarViewProps {
  calendarEvents: CalendarEvent[];
  accountNames: Map<string, string>;
  unknownEntityLabel: string;
  labels: CalendarViewLabels;
  entityNamesForEvent: (eventId: string) => string;
  onEventPress: (eventId: string, occurrenceTimestamp?: string) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export type CalendarViewLabels = {
  emptyTitle: string;
  emptyHint: string;
  unknownValue: string;
  event: {
    scheduledForLabel: string;
    occurredAtLabel: string;
    endsAtLabel: string;
    scoreLabel: string;
    floorsVisitedLabel: string;
    durationLabel: string;
    statusLabel: string;
  };
};

export const CalendarView = ({
  calendarEvents,
  accountNames,
  unknownEntityLabel,
  labels,
  entityNamesForEvent,
  onEventPress,
  selectedDate,
  onDateChange,
}: CalendarViewProps) => {
  const { colors, isDark } = useTheme();
  const calendarSettings = useCalendarSettings();
  const calendarTheme = useMemo(
    () => buildCalendarTheme(colors, isDark),
    [colors, isDark],
  );
  const calendarPalette = useMemo(
    () => resolveCalendarPalette(colors, calendarSettings.palette),
    [colors, calendarSettings.palette],
  );
  const calendarRange = useMemo(
    () => getCalendarMonthRange(selectedDate),
    [selectedDate],
  );
  const expandedEvents = useMemo(
    () =>
      expandCalendarEventsInRange(
        calendarEvents,
        calendarRange.start,
        calendarRange.end,
      ),
    [calendarEvents, calendarRange],
  );

  // Build agenda items
  const agendaItems = useMemo<CalendarEventAgendaItem[]>(() => {
    const items: CalendarEventAgendaItem[] = [];

    for (const event of expandedEvents) {
      const sourceEventId = event.recurrenceId ?? event.id;
      const accountName =
        event.type === "audit" && event.auditData?.accountId
          ? (accountNames.get(event.auditData.accountId) ?? unknownEntityLabel)
          : undefined;
      const entityNames = entityNamesForEvent(sourceEventId);
      const item = buildCalendarEventAgendaItem(
        event,
        accountName,
        entityNames,
      );
      if (item) items.push(item);
    }

    return items;
  }, [expandedEvents, accountNames, entityNamesForEvent, unknownEntityLabel]);

  // Build marked dates
  const markedDates = useMemo(
    () =>
      buildMarkedDatesFromCalendarEvents(
        expandedEvents,
        calendarPalette,
        colors.accent,
        selectedDate,
      ),
    [expandedEvents, selectedDate, calendarPalette, colors.accent],
  );

  const handleDayPress = useCallback(
    (day: DateData) => {
      onDateChange(day.dateString);
    },
    [onDateChange],
  );

  const getEventIcon = useCallback(
    (type: string) => {
      switch (type) {
        case "email":
          return (
            <Ionicons name="mail-outline" size={20} color={colors.accent} />
          );
        case "call":
          return (
            <Ionicons name="call-outline" size={20} color={colors.accent} />
          );
        case "meeting":
          return (
            <Ionicons
              name="people-circle-outline"
              size={20}
              color={colors.accent}
            />
          );
        case "audit":
          return (
            <Ionicons
              name="clipboard-outline"
              size={20}
              color={colors.accent}
            />
          );
        case "task":
          return (
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color={colors.accent}
            />
          );
        case "reminder":
          return (
            <Ionicons name="alarm-outline" size={20} color={colors.accent} />
          );
        case "other":
        default:
          return (
            <FontAwesome6
              name="lines-leaning"
              size={20}
              color={colors.accent}
            />
          );
      }
    },
    [colors.accent],
  );

  const formatTimestamp = useCallback(
    (timestamp?: string): string => {
      if (!timestamp) return labels.unknownValue;
      const date = new Date(timestamp);
      if (Number.isNaN(date.getTime())) return labels.unknownValue;
      return date.toLocaleString();
    },
    [labels.unknownValue],
  );

  const renderItem = useCallback(
    ({ item }: { item: CalendarEventAgendaItem }) => {
      const sourceEventId = item.event.recurrenceId ?? item.event.id;
      const occurrenceTimestamp = item.event.recurrenceId
        ? item.event.scheduledFor
        : undefined;
      const isRecurring = Boolean(
        item.event.recurrenceRule || item.event.recurrenceId,
      );
      const subtitleLabel =
        item.subtitleKey === "calendarEvents.scheduledFor"
          ? labels.event.scheduledForLabel
          : labels.event.occurredAtLabel;
      const subtitle = `${subtitleLabel}: ${formatTimestamp(item.startTimestamp)}`;

      const descriptionLines = [
        item.endTimestamp
          ? `${labels.event.endsAtLabel}: ${formatTimestamp(item.endTimestamp)}`
          : undefined,
        item.scoreValue
          ? `${labels.event.scoreLabel}: ${item.scoreValue}`
          : undefined,
      ].filter(Boolean);
      const description =
        descriptionLines.length > 0 ? descriptionLines.join("\n") : undefined;

      // For audits: use floors visited as footnote; for others: use description
      const footnote =
        item.event.type === "audit"
          ? item.floorsVisited && item.floorsVisited.length > 0
            ? `${labels.event.floorsVisitedLabel}: ${item.floorsVisited.join(", ")}`
            : undefined
          : item.description?.trim();

      return (
        <ListRow
          onPress={() => onEventPress(sourceEventId, occurrenceTimestamp)}
          title={item.displayName}
          subtitle={subtitle}
          description={description}
          footnote={footnote}
          descriptionNumberOfLines={3}
          footnoteNumberOfLines={2}
          style={styles.listRow}
          titleAccessory={
            <StatusBadge tone={item.statusTone} labelKey={item.statusKey} />
          }
        >
          <View style={styles.iconContainer}>
            <View style={styles.iconStack}>
              {getEventIcon(item.event.type)}
              {isRecurring ? (
                <Ionicons
                  name="repeat-outline"
                  size={14}
                  color={colors.textSecondary}
                  style={styles.recurrenceIcon}
                />
              ) : null}
            </View>
          </View>
        </ListRow>
      );
    },
    [
      onEventPress,
      getEventIcon,
      formatTimestamp,
      labels.event.endsAtLabel,
      labels.event.floorsVisitedLabel,
      labels.event.scheduledForLabel,
      labels.event.occurredAtLabel,
      labels.event.scoreLabel,
      colors.textSecondary,
    ],
  );

  const keyExtractor = useCallback(
    (item: CalendarEventAgendaItem) => `calendarEvent-${item.id}`,
    [],
  );

  const getItemType = useCallback((item: CalendarEventAgendaItem) => {
    return item.kind;
  }, []);

  return (
    <CalendarProvider date={selectedDate}>
      <ExpandableCalendar
        theme={calendarTheme}
        markedDates={markedDates}
        markingType="multi-dot"
        onDayPress={handleDayPress}
        firstDay={0}
        allowShadow={true}
        closeOnDayPress={true}
      />
      <View
        style={[styles.agendaContainer, { backgroundColor: colors.canvas }]}
      >
        <FlashList
          data={agendaItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemType={getItemType}
          estimatedItemSize={120}
          drawDistance={500}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {labels.emptyTitle}
              </Text>
              <Text style={[styles.emptyHint, { color: colors.textFaint }]}>
                {labels.emptyHint}
              </Text>
            </View>
          }
        />
      </View>
    </CalendarProvider>
  );
};

const styles = StyleSheet.create({
  agendaContainer: {
    flex: 1,
  },
  listContent: {
    paddingTop: 8,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconContainer: {
    marginLeft: 8,
  },
  iconStack: {
    alignItems: "center",
    gap: 4,
  },
  recurrenceIcon: {
    marginTop: -2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyHint: {
    fontSize: 14,
    textAlign: "center",
  },
});
