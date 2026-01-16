import assert from "node:assert/strict";

import { buildTypedEvent } from "@domains/actions/eventBuilder";

test("buildTypedEvent creates event with required fields", () => {
  const event = buildTypedEvent({
    type: "organization.created",
    payload: { name: "Acme Corp" },
    deviceId: "device-1",
  });

  assert.equal(event.type, "organization.created");
  assert.deepEqual(event.payload, { name: "Acme Corp" });
  assert.equal(event.deviceId, "device-1");
  assert.ok(event.id.startsWith("evt-"));
  assert.ok(event.timestamp);
});

test("buildTypedEvent includes entityId when provided", () => {
  const event = buildTypedEvent({
    type: "account.created",
    entityId: "acct-123",
    payload: { name: "Test Account" },
    deviceId: "device-1",
  });

  assert.equal(event.entityId, "acct-123");
});

test("buildTypedEvent uses provided timestamp when specified", () => {
  const customTimestamp = "2024-06-15T10:00:00.000Z";
  const event = buildTypedEvent({
    type: "contact.created",
    payload: { firstName: "John", lastName: "Doe" },
    deviceId: "device-1",
    timestamp: customTimestamp,
  });

  assert.equal(event.timestamp, customTimestamp);
});

test("buildTypedEvent generates unique IDs for successive calls", () => {
  const event1 = buildTypedEvent({
    type: "note.created",
    payload: { content: "Note 1" },
    deviceId: "device-1",
  });

  const event2 = buildTypedEvent({
    type: "note.created",
    payload: { content: "Note 2" },
    deviceId: "device-1",
  });

  assert.notEqual(event1.id, event2.id);
});

test("buildTypedEvent generates IDs with expected format", () => {
  const event = buildTypedEvent({
    type: "interaction.logged",
    payload: { notes: "Test" },
    deviceId: "device-1",
  });

  // Format: evt-{timestamp}-{counter}
  const idPattern = /^evt-\d+-\d+$/;
  assert.ok(idPattern.test(event.id), `ID should match pattern: ${event.id}`);
});

test("buildTypedEvent handles various event types", () => {
  const eventTypes = [
    "organization.created",
    "account.updated",
    "contact.deleted",
    "audit.completed",
    "calendarEvent.scheduled",
    "code.encrypted",
    "settings.security.updated",
    "device.registered",
  ] as const;

  for (const type of eventTypes) {
    const event = buildTypedEvent({
      type,
      payload: {},
      deviceId: "device-1",
    });

    assert.equal(event.type, type);
  }
});
