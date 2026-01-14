import type { CalendarEvent, RecurrenceRule } from "../calendarEvent";
import type { Timestamp } from "../shared/types";

type UtcTimeParts = {
  hour: number;
  minute: number;
  second: number;
  ms: number;
};

const toDate = (timestamp: Timestamp): Date | null => {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toEndOfDayUtc = (date: Date): Date =>
  new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );

const getUtcTimeParts = (date: Date): UtcTimeParts => ({
  hour: date.getUTCHours(),
  minute: date.getUTCMinutes(),
  second: date.getUTCSeconds(),
  ms: date.getUTCMilliseconds(),
});

const createUtcDate = (
  year: number,
  month: number,
  day: number,
  time: UtcTimeParts,
): Date | null => {
  const date = new Date(
    Date.UTC(year, month, day, time.hour, time.minute, time.second, time.ms),
  );
  if (date.getUTCMonth() !== month || date.getUTCDate() !== day) {
    return null;
  }
  return date;
};

const addDaysUtc = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const normalizeInterval = (rule: RecurrenceRule): number => {
  if (!Number.isFinite(rule.interval) || rule.interval <= 0) {
    return 1;
  }
  return Math.floor(rule.interval);
};

const normalizeByWeekDay = (rule: RecurrenceRule): number[] => {
  const days =
    rule.byWeekDay && rule.byWeekDay.length > 0 ? rule.byWeekDay : [];

  return Array.from(new Set(days.filter((day) => day >= 0 && day <= 6))).sort(
    (a, b) => a - b,
  );
};

const normalizeByMonthDay = (rule: RecurrenceRule): number[] => {
  const days =
    rule.byMonthDay && rule.byMonthDay.length > 0 ? rule.byMonthDay : [];

  return Array.from(new Set(days.filter((day) => day >= 1 && day <= 31))).sort(
    (a, b) => a - b,
  );
};

const startOfWeekUtc = (date: Date): Date => {
  const day = date.getUTCDay();
  return addDaysUtc(
    new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    ),
    -day,
  );
};

export const buildRecurrenceInstanceId = (
  parentId: string,
  timestamp: string,
): string => `${parentId}::${timestamp}`;

const buildRecurrenceInstance = (
  parentEvent: CalendarEvent,
  occurrence: Date,
): CalendarEvent => ({
  ...parentEvent,
  id: buildRecurrenceInstanceId(parentEvent.id, occurrence.toISOString()),
  recurrenceId: parentEvent.id,
  recurrenceRule: undefined,
  scheduledFor: occurrence.toISOString(),
});

export const generateRecurrenceInstances = (
  parentEvent: CalendarEvent,
  rangeStart: Timestamp,
  rangeEnd: Timestamp,
): CalendarEvent[] => {
  if (!parentEvent.recurrenceRule) {
    return [parentEvent];
  }

  const baseDate = toDate(parentEvent.scheduledFor);
  const startDate = toDate(rangeStart);
  const endDate = toDate(rangeEnd);

  if (!baseDate || !startDate || !endDate) {
    return [parentEvent];
  }

  const rule = parentEvent.recurrenceRule;
  const interval = normalizeInterval(rule);
  const timeParts = getUtcTimeParts(baseDate);
  const untilDate = rule.until ? toDate(rule.until) : null;
  const rangeEndDate =
    untilDate && untilDate < endDate ? toEndOfDayUtc(untilDate) : endDate;
  const occurrences: CalendarEvent[] = [];
  const maxCount =
    rule.count && rule.count > 0 ? rule.count : Number.POSITIVE_INFINITY;

  let generatedCount = 0;

  if (baseDate <= rangeEndDate) {
    generatedCount = 1;
    if (baseDate >= startDate) {
      occurrences.push(parentEvent);
    }
  }

  if (generatedCount >= maxCount) {
    return occurrences;
  }

  const maybeAddOccurrence = (occurrence: Date) => {
    if (occurrence <= baseDate) {
      return false;
    }

    generatedCount += 1;
    if (generatedCount > maxCount) {
      return true;
    }

    if (occurrence < startDate || occurrence > rangeEndDate) {
      return false;
    }

    occurrences.push(buildRecurrenceInstance(parentEvent, occurrence));
    return false;
  };

  switch (rule.frequency) {
    case "daily": {
      let current = addDaysUtc(baseDate, interval);
      while (current <= rangeEndDate && generatedCount < maxCount) {
        const shouldStop = maybeAddOccurrence(current);
        if (shouldStop) break;
        current = addDaysUtc(current, interval);
      }
      break;
    }
    case "weekly": {
      const weekDays = normalizeByWeekDay(rule);
      const resolvedWeekDays =
        weekDays.length > 0 ? weekDays : [baseDate.getUTCDay()];
      let weekStart = startOfWeekUtc(baseDate);
      let isFirstWeek = true;

      while (weekStart <= rangeEndDate && generatedCount < maxCount) {
        for (const day of resolvedWeekDays) {
          const occurrence = createUtcDate(
            weekStart.getUTCFullYear(),
            weekStart.getUTCMonth(),
            weekStart.getUTCDate() + day,
            timeParts,
          );
          if (!occurrence) continue;
          if (isFirstWeek && occurrence <= baseDate) {
            continue;
          }
          if (occurrence > rangeEndDate) {
            continue;
          }
          const shouldStop = maybeAddOccurrence(occurrence);
          if (shouldStop || generatedCount >= maxCount) {
            break;
          }
        }
        if (generatedCount >= maxCount) break;
        weekStart = addDaysUtc(weekStart, interval * 7);
        isFirstWeek = false;
      }
      break;
    }
    case "monthly": {
      const monthDays = normalizeByMonthDay(rule);
      const resolvedMonthDays =
        monthDays.length > 0 ? monthDays : [baseDate.getUTCDate()];
      let year = baseDate.getUTCFullYear();
      let month = baseDate.getUTCMonth();
      let isFirstMonth = true;

      while (
        createUtcDate(year, month, 1, timeParts) &&
        generatedCount < maxCount
      ) {
        const monthStart = createUtcDate(year, month, 1, timeParts);
        if (monthStart && monthStart > rangeEndDate) {
          break;
        }

        for (const day of resolvedMonthDays) {
          const occurrence = createUtcDate(year, month, day, timeParts);
          if (!occurrence) continue;
          if (isFirstMonth && occurrence <= baseDate) {
            continue;
          }
          if (occurrence > rangeEndDate) {
            continue;
          }
          const shouldStop = maybeAddOccurrence(occurrence);
          if (shouldStop || generatedCount >= maxCount) {
            break;
          }
        }

        if (generatedCount >= maxCount) break;

        month += interval;
        year += Math.floor(month / 12);
        month %= 12;
        if (month < 0) {
          month += 12;
          year -= 1;
        }
        isFirstMonth = false;
      }
      break;
    }
    case "yearly": {
      let year = baseDate.getUTCFullYear() + interval;
      const month = baseDate.getUTCMonth();
      const day = baseDate.getUTCDate();

      while (generatedCount < maxCount) {
        const occurrence = createUtcDate(year, month, day, timeParts);
        if (!occurrence) break;
        if (occurrence > rangeEndDate) break;
        const shouldStop = maybeAddOccurrence(occurrence);
        if (shouldStop) break;
        year += interval;
      }
      break;
    }
  }

  return occurrences;
};
