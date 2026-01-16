import assert from "node:assert/strict";

import { resolveEntityId } from "@domains/shared/entityUtils";
import type { Event } from "@events/event";

const createEvent = (overrides: Partial<Event> = {}): Event => ({
  id: "evt-1",
  type: "organization.created",
  payload: {},
  timestamp: "2024-01-01T00:00:00.000Z",
  deviceId: "device-1",
  ...overrides,
});

test("resolveEntityId returns payload.id when only payload has id", () => {
  const event = createEvent();
  const payload = { id: "entity-123" as const };

  const result = resolveEntityId(event, payload);

  assert.equal(result, "entity-123");
});

test("resolveEntityId returns entityId when only event has entityId", () => {
  const event = createEvent({ entityId: "entity-456" });
  const payload = {};

  const result = resolveEntityId(event, payload);

  assert.equal(result, "entity-456");
});

test("resolveEntityId returns id when both match", () => {
  const event = createEvent({ entityId: "entity-789" });
  const payload = { id: "entity-789" as const };

  const result = resolveEntityId(event, payload);

  assert.equal(result, "entity-789");
});

test("resolveEntityId throws when payload.id and event.entityId mismatch", () => {
  const event = createEvent({ entityId: "entity-abc" });
  const payload = { id: "entity-xyz" as const };

  assert.throws(() => resolveEntityId(event, payload), {
    message: "Event entityId mismatch: payload=entity-xyz, event=entity-abc",
  });
});

test("resolveEntityId throws when neither payload nor event has id", () => {
  const event = createEvent();
  const payload = {};

  assert.throws(() => resolveEntityId(event, payload), {
    message: "Event entityId is required.",
  });
});

test("resolveEntityId works with payload containing additional fields", () => {
  const event = createEvent({ entityId: "entity-full" });
  const payload = {
    id: "entity-full" as const,
    name: "Test Entity",
    status: "active",
  };

  const result = resolveEntityId(event, payload);

  assert.equal(result, "entity-full");
});

test("resolveEntityId prefers payload.id when event.entityId is undefined", () => {
  const event = createEvent({ entityId: undefined });
  const payload = { id: "from-payload" as const };

  const result = resolveEntityId(event, payload);

  assert.equal(result, "from-payload");
});
