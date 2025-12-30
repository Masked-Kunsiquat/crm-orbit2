import assert from "node:assert/strict";
import { test } from "node:test";

import { initAutomergeDoc } from "../crm-core/automerge/init";
import { interactionReducer } from "../crm-core/reducers/interaction.reducer";
import type { Event } from "../crm-core/events/event";

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
