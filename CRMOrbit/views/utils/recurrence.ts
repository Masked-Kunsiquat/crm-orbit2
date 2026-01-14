import type { CalendarEvent } from "@domains/calendarEvent";
import type { Timestamp } from "@domains/shared/types";
import { generateRecurrenceInstances } from "@domains/recurrence/instanceGenerator";

type CalendarRange = {
  start: Timestamp;
  end: Timestamp;
};

const toDate = (value: Timestamp): Date | null => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getCalendarMonthRange = (selectedDate: string): CalendarRange => {
  const parsed = new Date(`${selectedDate}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new RangeError(`Invalid selectedDate: ${selectedDate}`);
  }
  const base = parsed;

  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
};

const resolveEventTimestamp = (event: CalendarEvent): Timestamp | undefined => {
  if (event.status === "calendarEvent.status.completed") {
    return event.occurredAt ?? event.scheduledFor;
  }
  return event.scheduledFor;
};

const isEventInRange = (
  event: CalendarEvent,
  rangeStart: Date,
  rangeEnd: Date,
): boolean => {
  const timestamp = resolveEventTimestamp(event);
  if (!timestamp) return false;
  const eventDate = toDate(timestamp);
  if (!eventDate) return false;
  return eventDate >= rangeStart && eventDate <= rangeEnd;
};

export const expandCalendarEventsInRange = (
  calendarEvents: CalendarEvent[],
  rangeStart: Timestamp,
  rangeEnd: Timestamp,
): CalendarEvent[] => {
  const startDate = toDate(rangeStart);
  const endDate = toDate(rangeEnd);

  if (!startDate || !endDate) {
    return calendarEvents;
  }

  const expanded: CalendarEvent[] = [];

  for (const event of calendarEvents) {
    if (event.recurrenceRule) {
      expanded.push(
        ...generateRecurrenceInstances(event, rangeStart, rangeEnd),
      );
      continue;
    }

    if (isEventInRange(event, startDate, endDate)) {
      expanded.push(event);
    }
  }

  return expanded;
};
