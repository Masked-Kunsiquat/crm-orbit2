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

test("calendarEvent.externalImported rejects missing calendar events", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-ext-3",
    type: "calendarEvent.externalImported",
    payload: {
      linkId: "link-3",
      calendarEventId: "calendar-2",
      provider: "expo-calendar",
    },
    timestamp: "2026-01-02T13:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => calendarEventExternalReducer(doc, event), {
    message: "Calendar event not found: calendar-2",
  });
});

test("calendarEvent.externalImported returns the same doc when valid", () => {
  const doc = initAutomergeDoc();
  doc.calendarEvents["calendar-2"] = createCalendarEvent("calendar-2");
  const event: Event = {
    id: "evt-ext-4",
    type: "calendarEvent.externalImported",
    payload: {
      linkId: "link-4",
      calendarEventId: "calendar-2",
      provider: "expo-calendar",
    },
    timestamp: "2026-01-02T13:00:00.000Z",
    deviceId: "device-1",
  };

  const next = calendarEventExternalReducer(doc, event);

  assert.equal(next, doc);
});

test("calendarEvent.externalUpdated rejects unsupported providers", () => {
  const doc = initAutomergeDoc();
  doc.calendarEvents["calendar-3"] = createCalendarEvent("calendar-3");
  const event: Event = {
    id: "evt-ext-5",
    type: "calendarEvent.externalUpdated",
    payload: {
      calendarEventId: "calendar-3",
      provider: "ical" as "expo-calendar",
    },
    timestamp: "2026-01-02T14:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => calendarEventExternalReducer(doc, event), {
    message: "Unsupported external calendar provider: ical",
  });
});

test("calendarEvent.externalUpdated rejects missing calendar events", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-ext-6",
    type: "calendarEvent.externalUpdated",
    payload: {
      calendarEventId: "calendar-4",
      provider: "expo-calendar",
    },
    timestamp: "2026-01-02T14:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => calendarEventExternalReducer(doc, event), {
    message: "Calendar event not found: calendar-4",
  });
});

test("calendarEvent.externalUpdated returns the same doc when valid", () => {
  const doc = initAutomergeDoc();
  doc.calendarEvents["calendar-4"] = createCalendarEvent("calendar-4");
  const event: Event = {
    id: "evt-ext-7",
    type: "calendarEvent.externalUpdated",
    payload: {
      calendarEventId: "calendar-4",
      provider: "expo-calendar",
    },
    timestamp: "2026-01-02T14:00:00.000Z",
    deviceId: "device-1",
  };

  const next = calendarEventExternalReducer(doc, event);

  assert.equal(next, doc);
});

test("calendarEvent.externalUnlinked requires linkId", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-ext-8",
    type: "calendarEvent.externalUnlinked",
    payload: {
      linkId: "  ",
    },
    timestamp: "2026-01-02T15:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => calendarEventExternalReducer(doc, event), {
    message: "External calendar linkId is required.",
  });
});

test("calendarEvent.externalUnlinked allows missing provider and calendarEventId", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-ext-9",
    type: "calendarEvent.externalUnlinked",
    payload: {
      linkId: "link-9",
    },
    timestamp: "2026-01-02T15:00:00.000Z",
    deviceId: "device-1",
  };

  const next = calendarEventExternalReducer(doc, event);

  assert.equal(next, doc);
});

test("calendarEvent.externalUnlinked rejects unknown calendarEventId", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-ext-10",
    type: "calendarEvent.externalUnlinked",
    payload: {
      linkId: "link-10",
      calendarEventId: "calendar-5",
    },
    timestamp: "2026-01-02T15:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => calendarEventExternalReducer(doc, event), {
    message: "Calendar event not found: calendar-5",
  });
});
