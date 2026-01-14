import assert from "node:assert/strict";

import { initAutomergeDoc } from "@automerge/init";
import { calendarEventExternalReducer } from "@reducers/calendarEventExternal.reducer";
import type { Event } from "@events/event";
import type { CalendarEvent } from "@domains/calendarEvent";

const createCalendarEvent = (id: string): CalendarEvent => ({
  id,
  type: "calendarEvent.type.meeting",
  status: "calendarEvent.status.scheduled",
  summary: "Timeline review",
  scheduledFor: "2026-01-02T10:00:00.000Z",
  createdAt: "2026-01-01T09:00:00.000Z",
  updatedAt: "2026-01-01T09:00:00.000Z",
});

test("calendarEvent.externalLinked rejects missing calendar events", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-ext-1",
    type: "calendarEvent.externalLinked",
    payload: {
      linkId: "link-1",
      calendarEventId: "calendar-1",
      provider: "expo-calendar",
    },
    timestamp: "2026-01-02T12:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => calendarEventExternalReducer(doc, event), {
    message: "Calendar event not found: calendar-1",
  });
});

test("calendarEvent.externalLinked returns the same doc when valid", () => {
  const doc = initAutomergeDoc();
  doc.calendarEvents["calendar-1"] = createCalendarEvent("calendar-1");
  const event: Event = {
    id: "evt-ext-2",
    type: "calendarEvent.externalLinked",
    payload: {
      linkId: "link-2",
      calendarEventId: "calendar-1",
      provider: "expo-calendar",
    },
    timestamp: "2026-01-02T12:00:00.000Z",
    deviceId: "device-1",
  };

  const next = calendarEventExternalReducer(doc, event);

  assert.equal(next, doc);
});
