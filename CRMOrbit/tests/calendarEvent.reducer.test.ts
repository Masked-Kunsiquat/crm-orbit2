import assert from "node:assert/strict";

import { initAutomergeDoc } from "@automerge/init";
import { calendarEventReducer } from "@reducers/calendarEvent.reducer";
import type { Event } from "@events/event";
import type { CalendarEventStatus } from "@domains/calendarEvent";

test("calendarEvent.scheduled uses provided linkId for linked entities", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-cal-1",
    type: "calendarEvent.scheduled",
    entityId: "calendar-1",
    payload: {
      id: "calendar-1",
      type: "calendarEvent.type.meeting",
      summary: "Roadmap review",
      scheduledFor: "2026-01-02T10:00:00.000Z",
      linkedEntities: [
        {
          linkId: "link-1",
          entityType: "account",
          entityId: "account-1",
        },
      ],
    },
    timestamp: "2026-01-01T09:00:00.000Z",
    deviceId: "device-1",
  };

  const next = calendarEventReducer(doc, event);
  const link = next.relations.entityLinks["link-1"];

  assert.ok(link);
  assert.equal(link.linkType, "calendarEvent");
  assert.equal(link.calendarEventId, "calendar-1");
  assert.equal(link.entityType, "account");
  assert.equal(link.entityId, "account-1");
});

test("calendarEvent.scheduled normalizes legacy status values", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-cal-legacy",
    type: "calendarEvent.scheduled",
    entityId: "calendar-legacy",
    payload: {
      id: "calendar-legacy",
      type: "calendarEvent.type.meeting",
      summary: "Legacy status",
      scheduledFor: "2026-01-02T10:00:00.000Z",
      status: "scheduled" as CalendarEventStatus,
    },
    timestamp: "2026-01-01T09:00:00.000Z",
    deviceId: "device-1",
  };

  const next = calendarEventReducer(doc, event);
  assert.equal(
    next.calendarEvents["calendar-legacy"].status,
    "calendarEvent.status.scheduled",
  );
});

test("calendarEvent.linked stores link at payload linkId", () => {
  const doc = initAutomergeDoc();
  const scheduled: Event = {
    id: "evt-cal-2",
    type: "calendarEvent.scheduled",
    entityId: "calendar-2",
    payload: {
      id: "calendar-2",
      type: "calendarEvent.type.call",
      summary: "Follow-up",
      scheduledFor: "2026-01-02T12:00:00.000Z",
    },
    timestamp: "2026-01-01T10:00:00.000Z",
    deviceId: "device-1",
  };
  const linked: Event = {
    id: "evt-cal-3",
    type: "calendarEvent.linked",
    entityId: "calendar-2",
    payload: {
      linkId: "link-2",
      calendarEventId: "calendar-2",
      entityType: "contact",
      entityId: "contact-1",
    },
    timestamp: "2026-01-01T11:00:00.000Z",
    deviceId: "device-1",
  };

  const scheduledDoc = calendarEventReducer(doc, scheduled);
  const next = calendarEventReducer(scheduledDoc, linked);
  const link = next.relations.entityLinks["link-2"];

  assert.ok(link);
  assert.equal(link.linkType, "calendarEvent");
  assert.equal(link.calendarEventId, "calendar-2");
  assert.equal(link.entityType, "contact");
  assert.equal(link.entityId, "contact-1");
});

test("calendarEvent.completed rejects audits without accountId", () => {
  const doc = initAutomergeDoc();
  doc.calendarEvents["audit-1"] = {
    id: "audit-1",
    type: "calendarEvent.type.audit",
    status: "calendarEvent.status.scheduled",
    summary: "Audit",
    scheduledFor: "2026-01-03T09:00:00.000Z",
    createdAt: "2026-01-01T10:00:00.000Z",
    updatedAt: "2026-01-01T10:00:00.000Z",
  };

  const event: Event = {
    id: "evt-cal-4",
    type: "calendarEvent.completed",
    entityId: "audit-1",
    payload: {
      id: "audit-1",
      occurredAt: "2026-01-03T10:00:00.000Z",
    },
    timestamp: "2026-01-03T10:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => calendarEventReducer(doc, event), {
    message: "Audit events require accountId when completing.",
  });
});
