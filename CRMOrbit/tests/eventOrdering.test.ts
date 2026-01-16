import assert from "node:assert/strict";

import { sortEvents } from "@events/ordering";
import type { Event } from "@events/event";

const createEvent = (overrides: Partial<Event>): Event => ({
  id: "evt-1000-1",
  type: "organization.created",
  payload: {},
  timestamp: "2024-01-01T00:00:00.000Z",
  deviceId: "device-1",
  ...overrides,
});

test("sortEvents sorts by timestamp ascending", () => {
  const events: Event[] = [
    createEvent({ id: "evt-1000-1", timestamp: "2024-01-03T00:00:00.000Z" }),
    createEvent({ id: "evt-1000-2", timestamp: "2024-01-01T00:00:00.000Z" }),
    createEvent({ id: "evt-1000-3", timestamp: "2024-01-02T00:00:00.000Z" }),
  ];

  const sorted = sortEvents(events);

  assert.equal(sorted[0]?.timestamp, "2024-01-01T00:00:00.000Z");
  assert.equal(sorted[1]?.timestamp, "2024-01-02T00:00:00.000Z");
  assert.equal(sorted[2]?.timestamp, "2024-01-03T00:00:00.000Z");
});

test("sortEvents sorts by deviceId when timestamps are equal", () => {
  const events: Event[] = [
    createEvent({
      id: "evt-1000-1",
      timestamp: "2024-01-01T00:00:00.000Z",
      deviceId: "device-c",
    }),
    createEvent({
      id: "evt-1000-2",
      timestamp: "2024-01-01T00:00:00.000Z",
      deviceId: "device-a",
    }),
    createEvent({
      id: "evt-1000-3",
      timestamp: "2024-01-01T00:00:00.000Z",
      deviceId: "device-b",
    }),
  ];

  const sorted = sortEvents(events);

  assert.equal(sorted[0]?.deviceId, "device-a");
  assert.equal(sorted[1]?.deviceId, "device-b");
  assert.equal(sorted[2]?.deviceId, "device-c");
});

test("sortEvents sorts by event ID epoch when timestamp and deviceId are equal", () => {
  const events: Event[] = [
    createEvent({
      id: "evt-3000-1",
      timestamp: "2024-01-01T00:00:00.000Z",
      deviceId: "device-1",
    }),
    createEvent({
      id: "evt-1000-1",
      timestamp: "2024-01-01T00:00:00.000Z",
      deviceId: "device-1",
    }),
    createEvent({
      id: "evt-2000-1",
      timestamp: "2024-01-01T00:00:00.000Z",
      deviceId: "device-1",
    }),
  ];

  const sorted = sortEvents(events);

  assert.equal(sorted[0]?.id, "evt-1000-1");
  assert.equal(sorted[1]?.id, "evt-2000-1");
  assert.equal(sorted[2]?.id, "evt-3000-1");
});

test("sortEvents sorts by event ID counter when epoch is equal", () => {
  const events: Event[] = [
    createEvent({
      id: "evt-1000-3",
      timestamp: "2024-01-01T00:00:00.000Z",
      deviceId: "device-1",
    }),
    createEvent({
      id: "evt-1000-1",
      timestamp: "2024-01-01T00:00:00.000Z",
      deviceId: "device-1",
    }),
    createEvent({
      id: "evt-1000-2",
      timestamp: "2024-01-01T00:00:00.000Z",
      deviceId: "device-1",
    }),
  ];

  const sorted = sortEvents(events);

  assert.equal(sorted[0]?.id, "evt-1000-1");
  assert.equal(sorted[1]?.id, "evt-1000-2");
  assert.equal(sorted[2]?.id, "evt-1000-3");
});

test("sortEvents falls back to string comparison for non-standard IDs", () => {
  const events: Event[] = [
    createEvent({
      id: "custom-id-c",
      timestamp: "2024-01-01T00:00:00.000Z",
      deviceId: "device-1",
    }),
    createEvent({
      id: "custom-id-a",
      timestamp: "2024-01-01T00:00:00.000Z",
      deviceId: "device-1",
    }),
    createEvent({
      id: "custom-id-b",
      timestamp: "2024-01-01T00:00:00.000Z",
      deviceId: "device-1",
    }),
  ];

  const sorted = sortEvents(events);

  assert.equal(sorted[0]?.id, "custom-id-a");
  assert.equal(sorted[1]?.id, "custom-id-b");
  assert.equal(sorted[2]?.id, "custom-id-c");
});

test("sortEvents handles mixed standard and non-standard IDs", () => {
  const events: Event[] = [
    createEvent({
      id: "custom-id",
      timestamp: "2024-01-01T00:00:00.000Z",
      deviceId: "device-1",
    }),
    createEvent({
      id: "evt-1000-1",
      timestamp: "2024-01-01T00:00:00.000Z",
      deviceId: "device-1",
    }),
  ];

  // Should not throw, falls back to string comparison
  const sorted = sortEvents(events);
  assert.equal(sorted.length, 2);
});

test("sortEvents does not mutate original array", () => {
  const events: Event[] = [
    createEvent({ id: "evt-1000-2", timestamp: "2024-01-02T00:00:00.000Z" }),
    createEvent({ id: "evt-1000-1", timestamp: "2024-01-01T00:00:00.000Z" }),
  ];

  const originalFirstId = events[0]?.id;
  sortEvents(events);

  assert.equal(events[0]?.id, originalFirstId);
});

test("sortEvents handles empty array", () => {
  const sorted = sortEvents([]);
  assert.deepEqual(sorted, []);
});

test("sortEvents handles single element array", () => {
  const events: Event[] = [createEvent({ id: "evt-1000-1" })];
  const sorted = sortEvents(events);

  assert.equal(sorted.length, 1);
  assert.equal(sorted[0]?.id, "evt-1000-1");
});

test("sortEvents handles IDs with invalid numbers gracefully", () => {
  const events: Event[] = [
    createEvent({
      id: "evt-NaN-1",
      timestamp: "2024-01-01T00:00:00.000Z",
      deviceId: "device-1",
    }),
    createEvent({
      id: "evt-1000-1",
      timestamp: "2024-01-01T00:00:00.000Z",
      deviceId: "device-1",
    }),
  ];

  // Should fall back to string comparison for invalid ID
  const sorted = sortEvents(events);
  assert.equal(sorted.length, 2);
});

test("sortEvents handles IDs with Infinity gracefully", () => {
  const events: Event[] = [
    createEvent({
      id: "evt-Infinity-1",
      timestamp: "2024-01-01T00:00:00.000Z",
      deviceId: "device-1",
    }),
    createEvent({
      id: "evt-1000-1",
      timestamp: "2024-01-01T00:00:00.000Z",
      deviceId: "device-1",
    }),
  ];

  // Should fall back to string comparison for invalid ID
  const sorted = sortEvents(events);
  assert.equal(sorted.length, 2);
});
