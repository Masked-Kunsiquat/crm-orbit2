import React, { useCallback, useMemo, useState } from "react";
import {
  CalendarProvider,
  ExpandableCalendar,
  TimelineList,
} from "react-native-calendars";
import type { TimelineEventProps } from "react-native-calendars";
import type { DateData } from "react-native-calendars";

import type { Audit } from "@domains/audit";
import type { Interaction } from "@domains/interaction";
import { useTheme } from "../hooks";
import { buildCalendarTheme } from "../utils/calendarTheme";
import { getAuditEndTimestamp, getAuditStartTimestamp } from "../utils/audits";
import { addMinutesToTimestamp } from "../utils/duration";
import {
  buildMarkedDates,
  getInitialCalendarDate,
} from "../utils/calendarDataTransformers";
import { CALENDAR_COLORS } from "../utils/calendarColors";

export interface TimelineViewProps {
  audits: Audit[];
  interactions: Interaction[];
  accountNames: Map<string, string>;
  entityNamesForInteraction: (interactionId: string) => string;
  onAuditPress: (auditId: string) => void;
  onInteractionPress: (interactionId: string) => void;
}

interface TimelineEvent extends TimelineEventProps {
  id: string;
  kind: "audit" | "interaction";
}

const toISODate = (timestamp?: string): string | null => {
  if (!timestamp) return null;
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return null;
  const date = new Date(parsed);
  return date.toISOString().split("T")[0];
};

export const TimelineView = ({
  audits,
  interactions,
  accountNames,
  entityNamesForInteraction,
  onAuditPress,
  onInteractionPress,
}: TimelineViewProps) => {
  const { colors, isDark } = useTheme();
  const calendarTheme = useMemo(
    () => buildCalendarTheme(colors, isDark),
    [colors, isDark],
  );

  // Initial date (most recent event date or today)
  const initialDate = useMemo(
    () => getInitialCalendarDate(audits, interactions),
    [audits, interactions],
  );

  const [selectedDate, setSelectedDate] = useState<string>(initialDate);

  // Build marked dates for calendar
  const markedDates = useMemo(
    () => buildMarkedDates(audits, interactions, selectedDate),
    [audits, interactions, selectedDate],
  );

  // Build timeline events grouped by date
  const timelineEventsByDate = useMemo<Record<string, TimelineEvent[]>>(() => {
    const eventsByDate: Record<string, TimelineEvent[]> = {};

    // Add audit events
    for (const audit of audits) {
      const startTimestamp = getAuditStartTimestamp(audit);
      const endTimestamp = getAuditEndTimestamp(audit) ?? startTimestamp;

      if (!startTimestamp) continue;

      const dateKey = toISODate(startTimestamp);
      if (!dateKey) continue;

      const accountName =
        accountNames.get(audit.accountId) ?? "Unknown Account";

      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = [];
      }

      eventsByDate[dateKey].push({
        id: audit.id,
        kind: "audit",
        start: startTimestamp,
        end: endTimestamp,
        title: accountName,
        summary: audit.notes ?? "",
        color: CALENDAR_COLORS.timeline.audit,
      });
    }

    // Add interaction events
    for (const interaction of interactions) {
      const resolvedStatus =
        interaction.status ?? "interaction.status.completed";
      const usesScheduledTimestamp =
        resolvedStatus !== "interaction.status.completed";
      const startTimestamp = usesScheduledTimestamp
        ? (interaction.scheduledFor ?? interaction.occurredAt)
        : interaction.occurredAt;

      if (!startTimestamp) continue;

      const endTimestamp = addMinutesToTimestamp(
        startTimestamp,
        interaction.durationMinutes,
      );

      const dateKey = toISODate(startTimestamp);
      if (!dateKey) continue;

      const entityName = entityNamesForInteraction(interaction.id);

      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = [];
      }

      eventsByDate[dateKey].push({
        id: interaction.id,
        kind: "interaction",
        start: startTimestamp,
        end: endTimestamp ?? startTimestamp,
        title: interaction.summary,
        summary: entityName,
        color: CALENDAR_COLORS.timeline.interaction,
      });
    }

    return eventsByDate;
  }, [audits, interactions, accountNames, entityNamesForInteraction]);

  const handleEventPress = useCallback(
    (event: TimelineEvent) => {
      if (event.kind === "audit") {
        onAuditPress(event.id);
      } else {
        onInteractionPress(event.id);
      }
    },
    [onAuditPress, onInteractionPress],
  );

  const handleDayPress = useCallback((day: DateData) => {
    setSelectedDate(day.dateString);
  }, []);

  return (
    <CalendarProvider date={selectedDate} onDateChanged={setSelectedDate}>
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
        events={timelineEventsByDate}
        timelineProps={{
          format24h: true,
          onEventPress: handleEventPress,
          start: 6,
          end: 22,
          unavailableHours: [
            { start: 0, end: 6 },
            { start: 22, end: 24 },
          ],
          overlapEventsSpacing: 8,
          theme: calendarTheme,
        }}
        showNowIndicator
        scrollToFirst
      />
    </CalendarProvider>
  );
};
