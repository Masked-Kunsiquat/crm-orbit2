import assert from "node:assert/strict";

import { initAutomergeDoc } from "@automerge/init";
import { interactionReducer } from "@reducers/interaction.reducer";
import type { Event } from "@events/event";

test("interaction.logged adds a new interaction", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-interaction-1",
    type: "interaction.logged",
    payload: {
      id: "interaction-1",
      type: "interaction.type.call",
      occurredAt: "2024-06-01T00:00:00.000Z",
      summary: "Customer called to discuss renewal.",
    },
    timestamp: "2024-06-02T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = interactionReducer(doc, event);
  const interaction = next.interactions["interaction-1"];

  assert.ok(interaction);
  assert.equal(interaction.type, "interaction.type.call");
  assert.equal(interaction.occurredAt, "2024-06-01T00:00:00.000Z");
  assert.equal(interaction.summary, "Customer called to discuss renewal.");
  assert.equal(interaction.status, "interaction.status.completed");
  assert.equal(interaction.createdAt, event.timestamp);
  assert.equal(interaction.updatedAt, event.timestamp);
});

test("interaction.logged rejects duplicate ids", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-interaction-1",
    type: "interaction.logged",
    payload: {
      id: "interaction-1",
      type: "interaction.type.call",
      occurredAt: "2024-06-01T00:00:00.000Z",
      summary: "Customer called to discuss renewal.",
    },
    timestamp: "2024-06-02T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = interactionReducer(doc, event);

  assert.throws(() => interactionReducer(next, event), {
    message: "Interaction already exists: interaction-1",
  });
});

test("interaction.scheduled creates a scheduled interaction", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-interaction-2",
    type: "interaction.scheduled",
    payload: {
      id: "interaction-2",
      type: "interaction.type.meeting",
      scheduledFor: "2024-06-10T15:00:00.000Z",
      summary: "On-site walkthrough",
    },
    timestamp: "2024-06-05T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = interactionReducer(doc, event);
  const interaction = next.interactions["interaction-2"];

  assert.ok(interaction);
  assert.equal(interaction.scheduledFor, "2024-06-10T15:00:00.000Z");
  assert.equal(interaction.status, "interaction.status.scheduled");
  assert.equal(interaction.occurredAt, "2024-06-10T15:00:00.000Z");
});

test("interaction.rescheduled updates scheduledFor", () => {
  const doc = initAutomergeDoc();
  const scheduled: Event = {
    id: "evt-interaction-2",
    type: "interaction.scheduled",
    payload: {
      id: "interaction-2",
      type: "interaction.type.meeting",
      scheduledFor: "2024-06-10T15:00:00.000Z",
      summary: "On-site walkthrough",
    },
    timestamp: "2024-06-05T00:00:00.000Z",
    deviceId: "device-1",
  };
  const rescheduled: Event = {
    id: "evt-interaction-3",
    type: "interaction.rescheduled",
    payload: {
      id: "interaction-2",
      scheduledFor: "2024-06-11T15:30:00.000Z",
    },
    timestamp: "2024-06-06T00:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = interactionReducer(doc, scheduled);
  const updatedDoc = interactionReducer(createdDoc, rescheduled);
  const interaction = updatedDoc.interactions["interaction-2"];

  assert.equal(interaction.scheduledFor, "2024-06-11T15:30:00.000Z");
  assert.equal(interaction.occurredAt, "2024-06-11T15:30:00.000Z");
});

test("interaction.status.updated uses existing occurredAt when completing", () => {
  const doc = initAutomergeDoc();
  const scheduled: Event = {
    id: "evt-interaction-2",
    type: "interaction.scheduled",
    payload: {
      id: "interaction-2",
      type: "interaction.type.meeting",
      scheduledFor: "2024-06-10T15:00:00.000Z",
      summary: "On-site walkthrough",
    },
    timestamp: "2024-06-05T00:00:00.000Z",
    deviceId: "device-1",
  };
  const statusUpdated: Event = {
    id: "evt-interaction-4",
    type: "interaction.status.updated",
    payload: {
      id: "interaction-2",
      status: "interaction.status.completed",
    },
    timestamp: "2024-06-10T16:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = interactionReducer(doc, scheduled);
  const updatedDoc = interactionReducer(createdDoc, statusUpdated);
  const interaction = updatedDoc.interactions["interaction-2"];

  assert.equal(interaction.status, "interaction.status.completed");
  assert.equal(interaction.occurredAt, "2024-06-10T15:00:00.000Z");
});

test("interaction.status.updated stores completion details", () => {
  const doc = initAutomergeDoc();
  const scheduled: Event = {
    id: "evt-interaction-2",
    type: "interaction.scheduled",
    payload: {
      id: "interaction-2",
      type: "interaction.type.meeting",
      scheduledFor: "2024-06-10T15:00:00.000Z",
      summary: "On-site walkthrough",
    },
    timestamp: "2024-06-05T00:00:00.000Z",
    deviceId: "device-1",
  };
  const statusUpdated: Event = {
    id: "evt-interaction-4",
    type: "interaction.status.updated",
    payload: {
      id: "interaction-2",
      status: "interaction.status.completed",
      occurredAt: "2024-06-10T15:45:00.000Z",
    },
    timestamp: "2024-06-10T16:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = interactionReducer(doc, scheduled);
  const updatedDoc = interactionReducer(createdDoc, statusUpdated);
  const interaction = updatedDoc.interactions["interaction-2"];

  assert.equal(interaction.status, "interaction.status.completed");
  assert.equal(interaction.occurredAt, "2024-06-10T15:45:00.000Z");
});
