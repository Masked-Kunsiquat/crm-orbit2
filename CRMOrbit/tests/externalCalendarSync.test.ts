import assert from "node:assert/strict";

import * as Calendar from "expo-calendar";

import type { CalendarEvent } from "@domains/calendarEvent";
import {
  buildExternalToCrmEvents,
  type ExternalCalendarSnapshot,
} from "@views/utils/externalCalendarSync";

const createCalendarEvent = (): CalendarEvent => ({
  id: "calendar-1",
  type: "calendarEvent.type.meeting",
  status: "calendarEvent.status.scheduled",
  summary: "Quarterly review",
  description: "Agenda details",
  scheduledFor: "2026-01-10T10:00:00.000Z",
  durationMinutes: 60,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const createExternalSnapshot = (
  overrides: Partial<ExternalCalendarSnapshot> = {},
): ExternalCalendarSnapshot => ({
  externalEventId: "ext-1",
  calendarId: "cal-1",
  title: "Quarterly review",
  notes: "Agenda details",
  location: undefined,
  status: Calendar.EventStatus.CONFIRMED,
  startDate: new Date("2026-01-10T10:00:00.000Z"),
  endDate: new Date("2026-01-10T11:00:00.000Z"),
  lastModifiedAt: new Date("2026-01-10T09:00:00.000Z"),
  ...overrides,
});

test("buildExternalToCrmEvents emits canceled when external cancels", () => {
  const calendarEvent = createCalendarEvent();
  const external = createExternalSnapshot({
    status: Calendar.EventStatus.CANCELED,
  });

  const changes = buildExternalToCrmEvents(
    calendarEvent,
    external,
    "device-1",
    "2026-01-10T09:30:00.000Z",
  );

  assert.equal(changes.length, 1);
  assert.equal(changes[0]?.type, "calendarEvent.canceled");
  assert.deepEqual(changes[0]?.payload, { id: calendarEvent.id });
});

test("buildExternalToCrmEvents emits reschedule events for time changes", () => {
  const calendarEvent = createCalendarEvent();
  const external = createExternalSnapshot({
    startDate: new Date("2026-01-10T12:00:00.000Z"),
    endDate: new Date("2026-01-10T13:00:00.000Z"),
  });

  const changes = buildExternalToCrmEvents(
    calendarEvent,
    external,
    "device-1",
    "2026-01-10T11:30:00.000Z",
  );

  assert.equal(changes.length, 1);
  assert.equal(changes[0]?.type, "calendarEvent.rescheduled");
  assert.deepEqual(changes[0]?.payload, {
    id: calendarEvent.id,
    scheduledFor: "2026-01-10T12:00:00.000Z",
  });
});

test("buildExternalToCrmEvents emits updates for content changes", () => {
  const calendarEvent = createCalendarEvent();
  const external = createExternalSnapshot({
    title: "Quarterly review (updated)",
    notes: "New notes\ncrmOrbitId:calendar-1",
    location: "Board Room",
    endDate: new Date("2026-01-10T11:30:00.000Z"),
  });

  const changes = buildExternalToCrmEvents(
    calendarEvent,
    external,
    "device-1",
    "2026-01-10T11:00:00.000Z",
  );

  assert.equal(changes.length, 1);
  assert.equal(changes[0]?.type, "calendarEvent.updated");
  assert.deepEqual(changes[0]?.payload, {
    id: calendarEvent.id,
    summary: "Quarterly review (updated)",
    description: "New notes",
    location: "Board Room",
    durationMinutes: 90,
  });
});

test("buildExternalToCrmEvents returns empty when no changes detected", () => {
  const calendarEvent = createCalendarEvent();
  const external = createExternalSnapshot();

  const changes = buildExternalToCrmEvents(
    calendarEvent,
    external,
    "device-1",
    "2026-01-10T11:00:00.000Z",
  );

  assert.equal(changes.length, 0);
});
