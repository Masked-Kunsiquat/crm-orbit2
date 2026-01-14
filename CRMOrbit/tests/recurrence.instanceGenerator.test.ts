import assert from "node:assert/strict";

import type { CalendarEvent } from "@domains/calendarEvent";
import { generateRecurrenceInstances } from "@domains/recurrence/instanceGenerator";

const baseEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: "event-1",
  type: "calendarEvent.type.meeting",
  status: "calendarEvent.status.scheduled",
  summary: "Weekly sync",
  scheduledFor: "2024-01-01T10:00:00.000Z",
  createdAt: "2024-01-01T10:00:00.000Z",
  updatedAt: "2024-01-01T10:00:00.000Z",
  ...overrides,
});

test("daily recurrence respects count even when range starts later", () => {
  const event = baseEvent({
    recurrenceRule: {
      frequency: "daily",
      interval: 1,
      count: 2,
    },
  });

  const results = generateRecurrenceInstances(
    event,
    "2024-01-10T00:00:00.000Z",
    "2024-01-20T00:00:00.000Z",
  );

  assert.equal(results.length, 0);
});

test("weekly recurrence generates selected weekdays within range", () => {
  const event = baseEvent({
    recurrenceRule: {
      frequency: "weekly",
      interval: 1,
      byWeekDay: [1, 3],
    },
  });

  const results = generateRecurrenceInstances(
    event,
    "2024-01-01T00:00:00.000Z",
    "2024-01-10T23:59:59.000Z",
  );

  const dates = results.map((item) => item.scheduledFor);

  assert.deepEqual(dates, [
    "2024-01-01T10:00:00.000Z",
    "2024-01-03T10:00:00.000Z",
    "2024-01-08T10:00:00.000Z",
    "2024-01-10T10:00:00.000Z",
  ]);

  assert.equal(results[0].id, "event-1");
  assert.equal(results[1].recurrenceId, "event-1");
});

test("monthly recurrence skips invalid month days", () => {
  const event = baseEvent({
    recurrenceRule: {
      frequency: "monthly",
      interval: 1,
      byMonthDay: [15, 30],
    },
  });

  const results = generateRecurrenceInstances(
    event,
    "2024-01-01T00:00:00.000Z",
    "2024-03-31T23:59:59.000Z",
  );

  const dates = results.map((item) => item.scheduledFor);

  assert.deepEqual(dates, [
    "2024-01-01T10:00:00.000Z",
    "2024-01-15T10:00:00.000Z",
    "2024-01-30T10:00:00.000Z",
    "2024-02-15T10:00:00.000Z",
    "2024-03-15T10:00:00.000Z",
    "2024-03-30T10:00:00.000Z",
  ]);
});

test("yearly recurrence honors until date", () => {
  const event = baseEvent({
    recurrenceRule: {
      frequency: "yearly",
      interval: 1,
      until: "2026-01-01T00:00:00.000Z",
    },
  });

  const results = generateRecurrenceInstances(
    event,
    "2024-01-01T00:00:00.000Z",
    "2027-01-01T00:00:00.000Z",
  );

  const dates = results.map((item) => item.scheduledFor);

  assert.deepEqual(dates, [
    "2024-01-01T10:00:00.000Z",
    "2025-01-01T10:00:00.000Z",
    "2026-01-01T10:00:00.000Z",
  ]);
});
