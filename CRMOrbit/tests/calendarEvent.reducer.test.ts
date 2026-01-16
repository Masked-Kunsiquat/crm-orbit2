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

// calendarEvent.scheduled additional tests

test("calendarEvent.scheduled creates a basic meeting", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-cal-create",
    type: "calendarEvent.scheduled",
    entityId: "calendar-basic",
    payload: {
      id: "calendar-basic",
      type: "calendarEvent.type.meeting",
      summary: "Team standup",
      scheduledFor: "2026-01-02T09:00:00.000Z",
      durationMinutes: 30,
    },
    timestamp: "2026-01-01T08:00:00.000Z",
    deviceId: "device-1",
  };

  const next = calendarEventReducer(doc, event);
  const calEvent = next.calendarEvents["calendar-basic"];

  assert.ok(calEvent);
  assert.equal(calEvent.id, "calendar-basic");
  assert.equal(calEvent.type, "calendarEvent.type.meeting");
  assert.equal(calEvent.summary, "Team standup");
  assert.equal(calEvent.durationMinutes, 30);
  assert.equal(calEvent.createdAt, "2026-01-01T08:00:00.000Z");
});

test("calendarEvent.scheduled rejects duplicate events", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-dup",
    type: "calendarEvent.scheduled",
    entityId: "calendar-dup",
    payload: {
      id: "calendar-dup",
      type: "calendarEvent.type.call",
      summary: "Call",
      scheduledFor: "2026-01-02T10:00:00.000Z",
    },
    timestamp: "2026-01-01T08:00:00.000Z",
    deviceId: "device-1",
  };

  const next = calendarEventReducer(doc, event);

  assert.throws(() => calendarEventReducer(next, event), {
    message: "Calendar event already exists: calendar-dup",
  });
});

test("calendarEvent.scheduled rejects missing scheduledFor", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-no-sched",
    type: "calendarEvent.scheduled",
    entityId: "calendar-no-sched",
    payload: {
      id: "calendar-no-sched",
      type: "calendarEvent.type.meeting",
      summary: "No schedule",
    },
    timestamp: "2026-01-01T08:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => calendarEventReducer(doc, event), {
    message: "Calendar event scheduledFor is required.",
  });
});

test("calendarEvent.scheduled rejects audit without accountId", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-audit-no-acct",
    type: "calendarEvent.scheduled",
    entityId: "audit-no-acct",
    payload: {
      id: "audit-no-acct",
      type: "calendarEvent.type.audit",
      summary: "Audit without account",
      scheduledFor: "2026-01-02T10:00:00.000Z",
    },
    timestamp: "2026-01-01T08:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => calendarEventReducer(doc, event), {
    message: "Audit events require accountId.",
  });
});

test("calendarEvent.scheduled rejects invalid event type", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-invalid-type",
    type: "calendarEvent.scheduled",
    entityId: "calendar-invalid-type",
    payload: {
      id: "calendar-invalid-type",
      type: "invalid.type",
      summary: "Invalid",
      scheduledFor: "2026-01-02T10:00:00.000Z",
    },
    timestamp: "2026-01-01T08:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => calendarEventReducer(doc, event), {
    message: "Invalid calendar event type: invalid.type",
  });
});

test("calendarEvent.scheduled rejects invalid duration", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-bad-duration",
    type: "calendarEvent.scheduled",
    entityId: "calendar-bad-duration",
    payload: {
      id: "calendar-bad-duration",
      type: "calendarEvent.type.meeting",
      summary: "Bad duration",
      scheduledFor: "2026-01-02T10:00:00.000Z",
      durationMinutes: -30,
    },
    timestamp: "2026-01-01T08:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => calendarEventReducer(doc, event), {
    message: "Calendar event durationMinutes must be a positive integer.",
  });
});

test("calendarEvent.scheduled rejects linkedEntities without linkId", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-no-linkid",
    type: "calendarEvent.scheduled",
    entityId: "calendar-no-linkid",
    payload: {
      id: "calendar-no-linkid",
      type: "calendarEvent.type.meeting",
      summary: "Missing linkId",
      scheduledFor: "2026-01-02T10:00:00.000Z",
      linkedEntities: [{ entityType: "account", entityId: "acct-1" }],
    },
    timestamp: "2026-01-01T08:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => calendarEventReducer(doc, event), {
    message: "Linked entities require a linkId.",
  });
});

// calendarEvent.updated tests

test("calendarEvent.updated updates mutable fields", () => {
  const doc = initAutomergeDoc();
  doc.calendarEvents["calendar-upd"] = {
    id: "calendar-upd",
    type: "calendarEvent.type.meeting",
    status: "calendarEvent.status.scheduled",
    summary: "Original",
    scheduledFor: "2026-01-02T10:00:00.000Z",
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  };

  const event: Event = {
    id: "evt-upd",
    type: "calendarEvent.updated",
    entityId: "calendar-upd",
    payload: {
      id: "calendar-upd",
      summary: "Updated summary",
      description: "New description",
      durationMinutes: 60,
      location: "Conference Room A",
    },
    timestamp: "2026-01-01T09:00:00.000Z",
    deviceId: "device-1",
  };

  const next = calendarEventReducer(doc, event);
  const calEvent = next.calendarEvents["calendar-upd"];

  assert.equal(calEvent.summary, "Updated summary");
  assert.equal(calEvent.description, "New description");
  assert.equal(calEvent.durationMinutes, 60);
  assert.equal(calEvent.location, "Conference Room A");
  assert.equal(calEvent.updatedAt, "2026-01-01T09:00:00.000Z");
});

test("calendarEvent.updated rejects non-existent event", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-upd-notfound",
    type: "calendarEvent.updated",
    entityId: "calendar-notfound",
    payload: {
      id: "calendar-notfound",
      summary: "Updated",
    },
    timestamp: "2026-01-01T09:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => calendarEventReducer(doc, event), {
    message: "Calendar event not found: calendar-notfound",
  });
});

// calendarEvent.completed tests

test("calendarEvent.completed marks event as completed", () => {
  const doc = initAutomergeDoc();
  doc.calendarEvents["calendar-comp"] = {
    id: "calendar-comp",
    type: "calendarEvent.type.meeting",
    status: "calendarEvent.status.scheduled",
    summary: "Meeting",
    scheduledFor: "2026-01-02T10:00:00.000Z",
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  };

  const event: Event = {
    id: "evt-comp",
    type: "calendarEvent.completed",
    entityId: "calendar-comp",
    payload: {
      id: "calendar-comp",
      occurredAt: "2026-01-02T10:30:00.000Z",
      description: "Meeting notes",
    },
    timestamp: "2026-01-02T11:00:00.000Z",
    deviceId: "device-1",
  };

  const next = calendarEventReducer(doc, event);
  const calEvent = next.calendarEvents["calendar-comp"];

  assert.equal(calEvent.status, "calendarEvent.status.completed");
  assert.equal(calEvent.occurredAt, "2026-01-02T10:30:00.000Z");
  assert.equal(calEvent.description, "Meeting notes");
});

test("calendarEvent.completed rejects missing occurredAt", () => {
  const doc = initAutomergeDoc();
  doc.calendarEvents["calendar-no-occur"] = {
    id: "calendar-no-occur",
    type: "calendarEvent.type.meeting",
    status: "calendarEvent.status.scheduled",
    summary: "Meeting",
    scheduledFor: "2026-01-02T10:00:00.000Z",
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  };

  const event: Event = {
    id: "evt-no-occur",
    type: "calendarEvent.completed",
    entityId: "calendar-no-occur",
    payload: { id: "calendar-no-occur" },
    timestamp: "2026-01-02T11:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => calendarEventReducer(doc, event), {
    message: "Calendar event occurredAt is required when completing.",
  });
});

// calendarEvent.canceled tests

test("calendarEvent.canceled marks event as canceled", () => {
  const doc = initAutomergeDoc();
  doc.calendarEvents["calendar-canc"] = {
    id: "calendar-canc",
    type: "calendarEvent.type.meeting",
    status: "calendarEvent.status.scheduled",
    summary: "Meeting to cancel",
    scheduledFor: "2026-01-02T10:00:00.000Z",
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  };

  const event: Event = {
    id: "evt-canc",
    type: "calendarEvent.canceled",
    entityId: "calendar-canc",
    payload: { id: "calendar-canc" },
    timestamp: "2026-01-01T12:00:00.000Z",
    deviceId: "device-1",
  };

  const next = calendarEventReducer(doc, event);
  const calEvent = next.calendarEvents["calendar-canc"];

  assert.equal(calEvent.status, "calendarEvent.status.canceled");
});

test("calendarEvent.canceled rejects audit without accountId", () => {
  const doc = initAutomergeDoc();
  doc.calendarEvents["audit-canc"] = {
    id: "audit-canc",
    type: "calendarEvent.type.audit",
    status: "calendarEvent.status.scheduled",
    summary: "Audit",
    scheduledFor: "2026-01-02T10:00:00.000Z",
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  };

  const event: Event = {
    id: "evt-audit-canc",
    type: "calendarEvent.canceled",
    entityId: "audit-canc",
    payload: { id: "audit-canc" },
    timestamp: "2026-01-01T12:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => calendarEventReducer(doc, event), {
    message: "Audit events require accountId when canceling.",
  });
});

// calendarEvent.rescheduled tests

test("calendarEvent.rescheduled updates scheduledFor", () => {
  const doc = initAutomergeDoc();
  doc.calendarEvents["calendar-resch"] = {
    id: "calendar-resch",
    type: "calendarEvent.type.meeting",
    status: "calendarEvent.status.scheduled",
    summary: "Meeting to reschedule",
    scheduledFor: "2026-01-02T10:00:00.000Z",
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  };

  const event: Event = {
    id: "evt-resch",
    type: "calendarEvent.rescheduled",
    entityId: "calendar-resch",
    payload: {
      id: "calendar-resch",
      scheduledFor: "2026-01-03T14:00:00.000Z",
    },
    timestamp: "2026-01-01T12:00:00.000Z",
    deviceId: "device-1",
  };

  const next = calendarEventReducer(doc, event);
  const calEvent = next.calendarEvents["calendar-resch"];

  assert.equal(calEvent.scheduledFor, "2026-01-03T14:00:00.000Z");
  assert.equal(calEvent.status, "calendarEvent.status.scheduled");
  assert.equal(calEvent.occurredAt, undefined);
});

test("calendarEvent.rescheduled rejects missing scheduledFor", () => {
  const doc = initAutomergeDoc();
  doc.calendarEvents["calendar-resch-no-time"] = {
    id: "calendar-resch-no-time",
    type: "calendarEvent.type.meeting",
    status: "calendarEvent.status.scheduled",
    summary: "Meeting",
    scheduledFor: "2026-01-02T10:00:00.000Z",
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  };

  const event: Event = {
    id: "evt-resch-no-time",
    type: "calendarEvent.rescheduled",
    entityId: "calendar-resch-no-time",
    payload: { id: "calendar-resch-no-time" },
    timestamp: "2026-01-01T12:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => calendarEventReducer(doc, event), {
    message: "Calendar event scheduledFor is required.",
  });
});

// calendarEvent.deleted tests

test("calendarEvent.deleted removes event and its links", () => {
  const doc = initAutomergeDoc();
  doc.calendarEvents["calendar-del"] = {
    id: "calendar-del",
    type: "calendarEvent.type.meeting",
    status: "calendarEvent.status.scheduled",
    summary: "Meeting to delete",
    scheduledFor: "2026-01-02T10:00:00.000Z",
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  };
  doc.relations.entityLinks["link-del"] = {
    linkType: "calendarEvent",
    calendarEventId: "calendar-del",
    entityType: "account",
    entityId: "acct-1",
  };

  const event: Event = {
    id: "evt-del",
    type: "calendarEvent.deleted",
    entityId: "calendar-del",
    payload: { id: "calendar-del" },
    timestamp: "2026-01-01T12:00:00.000Z",
    deviceId: "device-1",
  };

  const next = calendarEventReducer(doc, event);

  assert.equal(next.calendarEvents["calendar-del"], undefined);
  assert.equal(next.relations.entityLinks["link-del"], undefined);
});

// calendarEvent.unlinked tests

test("calendarEvent.unlinked removes link", () => {
  const doc = initAutomergeDoc();
  doc.calendarEvents["calendar-unlink"] = {
    id: "calendar-unlink",
    type: "calendarEvent.type.meeting",
    status: "calendarEvent.status.scheduled",
    summary: "Meeting",
    scheduledFor: "2026-01-02T10:00:00.000Z",
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  };
  doc.relations.entityLinks["link-to-remove"] = {
    linkType: "calendarEvent",
    calendarEventId: "calendar-unlink",
    entityType: "contact",
    entityId: "contact-1",
  };

  const event: Event = {
    id: "evt-unlink",
    type: "calendarEvent.unlinked",
    entityId: "calendar-unlink",
    payload: { linkId: "link-to-remove" },
    timestamp: "2026-01-01T12:00:00.000Z",
    deviceId: "device-1",
  };

  const next = calendarEventReducer(doc, event);

  assert.equal(next.relations.entityLinks["link-to-remove"], undefined);
});

test("calendarEvent.unlinked rejects non-existent link", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-unlink-notfound",
    type: "calendarEvent.unlinked",
    entityId: "calendar-1",
    payload: { linkId: "nonexistent-link" },
    timestamp: "2026-01-01T12:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => calendarEventReducer(doc, event), {
    message: "Entity link not found: nonexistent-link",
  });
});

// calendarEvent.recurrence tests

test("calendarEvent.recurrence.created adds recurrence rule", () => {
  const doc = initAutomergeDoc();
  doc.calendarEvents["calendar-rec"] = {
    id: "calendar-rec",
    type: "calendarEvent.type.meeting",
    status: "calendarEvent.status.scheduled",
    summary: "Recurring meeting",
    scheduledFor: "2026-01-02T10:00:00.000Z",
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  };

  const event: Event = {
    id: "evt-rec-create",
    type: "calendarEvent.recurrence.created",
    entityId: "calendar-rec",
    payload: {
      id: "calendar-rec",
      recurrenceRule: {
        frequency: "weekly",
        interval: 1,
        byDay: ["MO", "WE", "FR"],
      },
    },
    timestamp: "2026-01-01T12:00:00.000Z",
    deviceId: "device-1",
  };

  const next = calendarEventReducer(doc, event);
  const calEvent = next.calendarEvents["calendar-rec"];

  assert.ok(calEvent.recurrenceRule);
  assert.equal(calEvent.recurrenceRule.frequency, "weekly");
});

test("calendarEvent.recurrence.created rejects if rule already exists", () => {
  const doc = initAutomergeDoc();
  doc.calendarEvents["calendar-rec-exists"] = {
    id: "calendar-rec-exists",
    type: "calendarEvent.type.meeting",
    status: "calendarEvent.status.scheduled",
    summary: "Already recurring",
    scheduledFor: "2026-01-02T10:00:00.000Z",
    recurrenceRule: { frequency: "daily", interval: 1 },
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  };

  const event: Event = {
    id: "evt-rec-dup",
    type: "calendarEvent.recurrence.created",
    entityId: "calendar-rec-exists",
    payload: {
      id: "calendar-rec-exists",
      recurrenceRule: { frequency: "weekly", interval: 1 },
    },
    timestamp: "2026-01-01T12:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => calendarEventReducer(doc, event), {
    message:
      "Calendar event calendar-rec-exists already has a recurrence rule. Use calendarEvent.recurrence.updated instead.",
  });
});

test("calendarEvent.recurrence.updated updates existing rule", () => {
  const doc = initAutomergeDoc();
  doc.calendarEvents["calendar-rec-upd"] = {
    id: "calendar-rec-upd",
    type: "calendarEvent.type.meeting",
    status: "calendarEvent.status.scheduled",
    summary: "Recurring",
    scheduledFor: "2026-01-02T10:00:00.000Z",
    recurrenceRule: { frequency: "daily", interval: 1 },
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  };

  const event: Event = {
    id: "evt-rec-upd",
    type: "calendarEvent.recurrence.updated",
    entityId: "calendar-rec-upd",
    payload: {
      id: "calendar-rec-upd",
      recurrenceRule: { frequency: "weekly", interval: 2 },
    },
    timestamp: "2026-01-01T12:00:00.000Z",
    deviceId: "device-1",
  };

  const next = calendarEventReducer(doc, event);
  const calEvent = next.calendarEvents["calendar-rec-upd"];

  assert.equal(calEvent.recurrenceRule?.frequency, "weekly");
  assert.equal(calEvent.recurrenceRule?.interval, 2);
});

test("calendarEvent.recurrence.updated rejects if no existing rule", () => {
  const doc = initAutomergeDoc();
  doc.calendarEvents["calendar-no-rec"] = {
    id: "calendar-no-rec",
    type: "calendarEvent.type.meeting",
    status: "calendarEvent.status.scheduled",
    summary: "Not recurring",
    scheduledFor: "2026-01-02T10:00:00.000Z",
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  };

  const event: Event = {
    id: "evt-rec-upd-fail",
    type: "calendarEvent.recurrence.updated",
    entityId: "calendar-no-rec",
    payload: {
      id: "calendar-no-rec",
      recurrenceRule: { frequency: "weekly", interval: 1 },
    },
    timestamp: "2026-01-01T12:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => calendarEventReducer(doc, event), {
    message:
      "Calendar event calendar-no-rec does not have a recurrence rule. Use calendarEvent.recurrence.created instead.",
  });
});

test("calendarEvent.recurrence.deleted removes recurrence rule", () => {
  const doc = initAutomergeDoc();
  doc.calendarEvents["calendar-rec-del"] = {
    id: "calendar-rec-del",
    type: "calendarEvent.type.meeting",
    status: "calendarEvent.status.scheduled",
    summary: "Recurring to delete",
    scheduledFor: "2026-01-02T10:00:00.000Z",
    recurrenceRule: { frequency: "daily", interval: 1 },
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  };

  const event: Event = {
    id: "evt-rec-del",
    type: "calendarEvent.recurrence.deleted",
    entityId: "calendar-rec-del",
    payload: { id: "calendar-rec-del" },
    timestamp: "2026-01-01T12:00:00.000Z",
    deviceId: "device-1",
  };

  const next = calendarEventReducer(doc, event);
  const calEvent = next.calendarEvents["calendar-rec-del"];

  assert.equal(calEvent.recurrenceRule, undefined);
});

// Unhandled event type

test("calendarEventReducer throws on unhandled event type", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-unknown",
    type: "unknown.event" as Event["type"],
    entityId: "calendar-1",
    payload: {},
    timestamp: "2026-01-01T12:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => calendarEventReducer(doc, event), {
    message: "calendarEvent.reducer does not handle event type: unknown.event",
  });
});
