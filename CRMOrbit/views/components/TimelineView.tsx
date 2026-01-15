import React, { useCallback, useMemo } from "react";
import {
  CalendarProvider,
  ExpandableCalendar,
  Timeline,
  TimelineList,
} from "react-native-calendars";
import type {
  TimelineEventProps,
  TimelineListRenderItemInfo,
  TimelineProps,
} from "react-native-calendars";
import type { DateData } from "react-native-calendars";

import type { CalendarEvent } from "@domains/calendarEvent";
import { useTheme } from "../hooks";
import { buildCalendarTheme } from "../utils/calendarTheme";
import { addMinutesToTimestamp } from "../utils/duration";
import {
  buildMarkedDatesFromCalendarEvents,
  toISODate,
} from "../utils/calendarDataTransformers";
import {
  getCalendarEventDotColor,
  resolveCalendarPalette,
} from "../utils/calendarColors";
import {
  expandCalendarEventsInRange,
  getCalendarMonthRange,
} from "../utils/recurrence";
import { useCalendarSettings } from "../store/store";

export interface TimelineViewProps {
  calendarEvents: CalendarEvent[];
  accountNames: Map<string, string>;
  unknownEntityLabel: string;
  entityNamesForEvent?: (calendarEventId: string) => string;
  onEventPress: (calendarEventId: string, occurrenceTimestamp?: string) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
}

interface TimelineEvent extends TimelineEventProps {
  id: string;
  calendarEventId: string;
  occurrenceTimestamp?: string;
}

export const TimelineView = ({
  calendarEvents,
  accountNames,
  unknownEntityLabel,
  entityNamesForEvent,
  onEventPress,
  selectedDate,
  onDateChange,
}: TimelineViewProps) => {
  const { colors, isDark } = useTheme();
  const calendarSettings = useCalendarSettings();
  const calendarTheme = useMemo(
    () => buildCalendarTheme(colors, isDark, selectedDate),
    [colors, isDark, selectedDate],
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

  // Build marked dates for calendar
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

  // Build timeline events grouped by date
  const timelineEventsByDate = useMemo<Record<string, TimelineEvent[]>>(() => {
    const eventsByDate: Record<string, TimelineEvent[]> = {};

    for (const event of expandedEvents) {
      const sourceEventId = event.recurrenceId ?? event.id;
      const occurrenceTimestamp = event.recurrenceId
        ? event.scheduledFor
        : undefined;
      const isCompleted = event.status === "calendarEvent.status.completed";
      const startTimestamp = isCompleted
        ? (event.occurredAt ?? event.scheduledFor)
        : event.scheduledFor;

      if (!startTimestamp) continue;

      const dateKey = toISODate(startTimestamp);
      if (!dateKey) continue;

      const endTimestamp =
        addMinutesToTimestamp(startTimestamp, event.durationMinutes) ??
        startTimestamp;
      const accountName =
        event.type === "calendarEvent.type.audit" && event.auditData?.accountId
          ? (accountNames.get(event.auditData.accountId) ?? unknownEntityLabel)
          : undefined;
      const title =
        event.type === "calendarEvent.type.audit" && accountName
          ? accountName
          : event.summary;
      const linkedNames = entityNamesForEvent?.(sourceEventId)?.trim();
      const summaryParts: string[] = [];
      const auditAccountId = event.auditData?.accountId;
      const legacyAuditSummary =
        event.type === "calendarEvent.type.audit" &&
        !!event.summary &&
        ((auditAccountId && event.summary.includes(auditAccountId)) ||
          event.summary.toLowerCase().startsWith("audit for account"));

      if (event.type === "calendarEvent.type.audit") {
        if (event.summary?.trim() && !legacyAuditSummary) {
          summaryParts.push(event.summary.trim());
        }
      } else if (linkedNames) {
        summaryParts.push(linkedNames);
      }

      if (event.location?.trim()) summaryParts.push(event.location.trim());
      if (event.description?.trim())
        summaryParts.push(event.description.trim());

      const summary = summaryParts.join(" · ");
      const color = getCalendarEventDotColor(
        calendarPalette,
        event.status,
        event.type,
      );

      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = [];
      }

      eventsByDate[dateKey].push({
        id: event.id,
        calendarEventId: sourceEventId,
        occurrenceTimestamp,
        start: startTimestamp,
        end: endTimestamp,
        title,
        summary,
        color,
      });
    }

    return eventsByDate;
  }, [
    expandedEvents,
    accountNames,
    unknownEntityLabel,
    entityNamesForEvent,
    calendarPalette,
  ]);

  const eventsKey = useMemo(
    () =>
      expandedEvents
        .map(
          (event) =>
            `${event.id}:${event.scheduledFor}:${event.occurredAt ?? ""}:${event.status}`,
        )
        .join("|"),
    [expandedEvents],
  );

  const handleEventPress = useCallback(
    (event: TimelineEventProps) => {
      if (!event) return;
      const timelineEvent = event as TimelineEvent;
      const rawId =
        typeof timelineEvent.id === "string" ? timelineEvent.id : "";
      const baseId = rawId.split("::")[0];
      const calendarEventId = timelineEvent.calendarEventId ?? baseId;
      if (calendarEventId) {
        onEventPress(calendarEventId, timelineEvent.occurrenceTimestamp);
      }
    },
    [onEventPress],
  );

  const handleDayPress = useCallback(
    (day: DateData) => {
      onDateChange(day.dateString);
    },
    [onDateChange],
  );

  const renderTimelineItem = useCallback(
    (timelineProps: TimelineProps, info: TimelineListRenderItemInfo) => {
      const rest = { ...timelineProps } as TimelineProps & { key?: string };
      delete rest.key;
      return (
        <Timeline
          key={info.item}
          {...rest}
          onEventPress={handleEventPress}
          eventTapped={handleEventPress}
        />
      );
    },
    [handleEventPress],
  );

  return (
    <CalendarProvider
      date={selectedDate}
      onDateChanged={(date) => onDateChange(date)}
    >
      <ExpandableCalendar
        theme={calendarTheme}
        markedDates={markedDates}
        markingType="multi-dot"
        onDayPress={handleDayPress}
        firstDay={0}
        allowShadow={true}
        closeOnDayPress={true}
      />
      <TimelineList
        key={eventsKey}
        events={timelineEventsByDate}
        renderItem={renderTimelineItem}
        timelineProps={{
          format24h: true,
          onEventPress: handleEventPress,
          eventTapped: handleEventPress,
          start: 6,
          end: 22,
          unavailableHours: [
            { start: 0, end: 6 },
            { start: 22, end: 24 },
          ],
          unavailableHoursColor: colors.surfaceElevated,
          overlapEventsSpacing: 8,
          theme: calendarTheme,
        }}
        showNowIndicator
        scrollToFirst
      />
    </CalendarProvider>
  );
};
