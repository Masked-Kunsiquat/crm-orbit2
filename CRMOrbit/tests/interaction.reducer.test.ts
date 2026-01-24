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

test("interaction.logged rejects invalid duration", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-interaction-1",
    type: "interaction.logged",
    payload: {
      id: "interaction-1",
      type: "interaction.type.call",
      occurredAt: "2024-06-01T00:00:00.000Z",
      summary: "Customer called to discuss renewal.",
      durationMinutes: 0,
    },
    timestamp: "2024-06-02T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => interactionReducer(doc, event), {
    message: "Interaction durationMinutes must be a positive integer.",
  });
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

test("interaction.updated stores duration updates", () => {
  const doc = initAutomergeDoc();
  const logged: Event = {
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
  const updated: Event = {
    id: "evt-interaction-2",
    type: "interaction.updated",
    payload: {
      id: "interaction-1",
      durationMinutes: 30,
    },
    timestamp: "2024-06-03T00:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = interactionReducer(doc, logged);
  const updatedDoc = interactionReducer(createdDoc, updated);
  const interaction = updatedDoc.interactions["interaction-1"];

  assert.equal(interaction.durationMinutes, 30);
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

test("interaction.logged rejects invalid status", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-interaction-1",
    type: "interaction.logged",
    payload: {
      id: "interaction-1",
      type: "interaction.type.call",
      occurredAt: "2024-06-01T00:00:00.000Z",
      summary: "Customer called.",
      status: "interaction.status.invalid",
    },
    timestamp: "2024-06-02T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => interactionReducer(doc, event), {
    message: "Invalid interaction status: interaction.status.invalid",
  });
});

test("interaction.logged rejects non-completed status", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-interaction-1",
    type: "interaction.logged",
    payload: {
      id: "interaction-1",
      type: "interaction.type.call",
      occurredAt: "2024-06-01T00:00:00.000Z",
      summary: "Customer called.",
      status: "interaction.status.scheduled",
    },
    timestamp: "2024-06-02T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => interactionReducer(doc, event), {
    message: "Logged interactions must be completed.",
  });
});

test("interaction.logged accepts non-integer duration as invalid", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-interaction-1",
    type: "interaction.logged",
    payload: {
      id: "interaction-1",
      type: "interaction.type.call",
      occurredAt: "2024-06-01T00:00:00.000Z",
      summary: "Customer called.",
      durationMinutes: 30.5,
    },
    timestamp: "2024-06-02T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => interactionReducer(doc, event), {
    message: "Interaction durationMinutes must be a positive integer.",
  });
});

test("interaction.scheduled rejects duplicate id", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-interaction-1",
    type: "interaction.scheduled",
    payload: {
      id: "interaction-1",
      type: "interaction.type.meeting",
      scheduledFor: "2024-06-10T15:00:00.000Z",
      summary: "On-site walkthrough",
    },
    timestamp: "2024-06-05T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = interactionReducer(doc, event);

  assert.throws(() => interactionReducer(next, event), {
    message: "Interaction already exists: interaction-1",
  });
});

test("interaction.scheduled rejects missing scheduledFor", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-interaction-1",
    type: "interaction.scheduled",
    payload: {
      id: "interaction-1",
      type: "interaction.type.meeting",
      summary: "On-site walkthrough",
    },
    timestamp: "2024-06-05T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => interactionReducer(doc, event), {
    message: "Interaction scheduledFor is required.",
  });
});

test("interaction.scheduled with explicit status", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-interaction-1",
    type: "interaction.scheduled",
    payload: {
      id: "interaction-1",
      type: "interaction.type.meeting",
      scheduledFor: "2024-06-10T15:00:00.000Z",
      summary: "On-site walkthrough",
      status: "interaction.status.scheduled",
    },
    timestamp: "2024-06-05T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = interactionReducer(doc, event);
  const interaction = next.interactions["interaction-1"];

  assert.equal(interaction.status, "interaction.status.scheduled");
});

test("interaction.scheduled with duration", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-interaction-1",
    type: "interaction.scheduled",
    payload: {
      id: "interaction-1",
      type: "interaction.type.meeting",
      scheduledFor: "2024-06-10T15:00:00.000Z",
      summary: "On-site walkthrough",
      durationMinutes: 60,
    },
    timestamp: "2024-06-05T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = interactionReducer(doc, event);
  const interaction = next.interactions["interaction-1"];

  assert.equal(interaction.durationMinutes, 60);
});

test("interaction.rescheduled rejects missing interaction", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-interaction-1",
    type: "interaction.rescheduled",
    payload: {
      id: "interaction-missing",
      scheduledFor: "2024-06-11T15:30:00.000Z",
    },
    timestamp: "2024-06-06T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => interactionReducer(doc, event), {
    message: "Interaction not found: interaction-missing",
  });
});

test("interaction.rescheduled rejects missing scheduledFor", () => {
  const doc = initAutomergeDoc();
  const scheduled: Event = {
    id: "evt-interaction-1",
    type: "interaction.scheduled",
    payload: {
      id: "interaction-1",
      type: "interaction.type.meeting",
      scheduledFor: "2024-06-10T15:00:00.000Z",
      summary: "On-site walkthrough",
    },
    timestamp: "2024-06-05T00:00:00.000Z",
    deviceId: "device-1",
  };
  const rescheduled: Event = {
    id: "evt-interaction-2",
    type: "interaction.rescheduled",
    payload: {
      id: "interaction-1",
    },
    timestamp: "2024-06-06T00:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = interactionReducer(doc, scheduled);

  assert.throws(() => interactionReducer(createdDoc, rescheduled), {
    message: "Interaction scheduledFor is required.",
  });
});

test("interaction.status.updated rejects missing interaction", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-interaction-1",
    type: "interaction.status.updated",
    payload: {
      id: "interaction-missing",
      status: "interaction.status.completed",
    },
    timestamp: "2024-06-10T16:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => interactionReducer(doc, event), {
    message: "Interaction not found: interaction-missing",
  });
});

test("interaction.status.updated rejects invalid status", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-interaction-1",
    type: "interaction.status.updated",
    payload: {
      id: "interaction-1",
      status: "interaction.status.invalid",
    },
    timestamp: "2024-06-10T16:00:00.000Z",
    deviceId: "device-1",
  };

  const logged: Event = {
    id: "evt-interaction-0",
    type: "interaction.logged",
    payload: {
      id: "interaction-1",
      type: "interaction.type.call",
      occurredAt: "2024-06-01T00:00:00.000Z",
      summary: "Test",
    },
    timestamp: "2024-06-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = interactionReducer(doc, logged);

  assert.throws(() => interactionReducer(createdDoc, event), {
    message: "Invalid interaction status: interaction.status.invalid",
  });
});

test("interaction.status.updated rejects scheduling without scheduledFor", () => {
  const doc = initAutomergeDoc();
  const logged: Event = {
    id: "evt-interaction-0",
    type: "interaction.logged",
    payload: {
      id: "interaction-1",
      type: "interaction.type.call",
      occurredAt: "2024-06-01T00:00:00.000Z",
      summary: "Test",
    },
    timestamp: "2024-06-01T00:00:00.000Z",
    deviceId: "device-1",
  };
  const statusUpdated: Event = {
    id: "evt-interaction-1",
    type: "interaction.status.updated",
    payload: {
      id: "interaction-1",
      status: "interaction.status.scheduled",
    },
    timestamp: "2024-06-10T16:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = interactionReducer(doc, logged);

  assert.throws(() => interactionReducer(createdDoc, statusUpdated), {
    message: "Interaction scheduledFor is required when marking scheduled.",
  });
});

test("interaction.updated updates type, summary, and occurredAt", () => {
  const doc = initAutomergeDoc();
  const logged: Event = {
    id: "evt-interaction-1",
    type: "interaction.logged",
    payload: {
      id: "interaction-1",
      type: "interaction.type.call",
      occurredAt: "2024-06-01T00:00:00.000Z",
      summary: "Original summary",
    },
    timestamp: "2024-06-02T00:00:00.000Z",
    deviceId: "device-1",
  };
  const updated: Event = {
    id: "evt-interaction-2",
    type: "interaction.updated",
    payload: {
      id: "interaction-1",
      type: "interaction.type.email",
      summary: "Updated summary",
      occurredAt: "2024-06-01T12:00:00.000Z",
    },
    timestamp: "2024-06-03T00:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = interactionReducer(doc, logged);
  const updatedDoc = interactionReducer(createdDoc, updated);
  const interaction = updatedDoc.interactions["interaction-1"];

  assert.equal(interaction.type, "interaction.type.email");
  assert.equal(interaction.summary, "Updated summary");
  assert.equal(interaction.occurredAt, "2024-06-01T12:00:00.000Z");
  assert.equal(interaction.updatedAt, "2024-06-03T00:00:00.000Z");
});

test("interaction.updated rejects missing interaction", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-interaction-1",
    type: "interaction.updated",
    payload: {
      id: "interaction-missing",
      summary: "Updated summary",
    },
    timestamp: "2024-06-03T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => interactionReducer(doc, event), {
    message: "Interaction not found: interaction-missing",
  });
});

test("interaction.updated rejects invalid duration", () => {
  const doc = initAutomergeDoc();
  const logged: Event = {
    id: "evt-interaction-1",
    type: "interaction.logged",
    payload: {
      id: "interaction-1",
      type: "interaction.type.call",
      occurredAt: "2024-06-01T00:00:00.000Z",
      summary: "Test",
    },
    timestamp: "2024-06-02T00:00:00.000Z",
    deviceId: "device-1",
  };
  const updated: Event = {
    id: "evt-interaction-2",
    type: "interaction.updated",
    payload: {
      id: "interaction-1",
      durationMinutes: -5,
    },
    timestamp: "2024-06-03T00:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = interactionReducer(doc, logged);

  assert.throws(() => interactionReducer(createdDoc, updated), {
    message: "Interaction durationMinutes must be a positive integer.",
  });
});

test("interaction.deleted removes interaction", () => {
  const doc = initAutomergeDoc();
  const logged: Event = {
    id: "evt-interaction-1",
    type: "interaction.logged",
    payload: {
      id: "interaction-1",
      type: "interaction.type.call",
      occurredAt: "2024-06-01T00:00:00.000Z",
      summary: "Test",
    },
    timestamp: "2024-06-02T00:00:00.000Z",
    deviceId: "device-1",
  };
  const deleted: Event = {
    id: "evt-interaction-2",
    type: "interaction.deleted",
    payload: {
      id: "interaction-1",
    },
    timestamp: "2024-06-03T00:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = interactionReducer(doc, logged);
  assert.ok(createdDoc.interactions["interaction-1"]);

  const deletedDoc = interactionReducer(createdDoc, deleted);
  assert.equal(deletedDoc.interactions["interaction-1"], undefined);
});

test("interaction.deleted rejects missing interaction", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-interaction-1",
    type: "interaction.deleted",
    payload: {
      id: "interaction-missing",
    },
    timestamp: "2024-06-03T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => interactionReducer(doc, event), {
    message: "Interaction not found: interaction-missing",
  });
});

test("interaction.deleted removes associated entity links", () => {
  const doc = initAutomergeDoc();
  const logged: Event = {
    id: "evt-interaction-1",
    type: "interaction.logged",
    payload: {
      id: "interaction-1",
      type: "interaction.type.call",
      occurredAt: "2024-06-01T00:00:00.000Z",
      summary: "Test",
    },
    timestamp: "2024-06-02T00:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = interactionReducer(doc, logged);

  // Manually add an entity link for the interaction
  const docWithLink = {
    ...createdDoc,
    relations: {
      ...createdDoc.relations,
      entityLinks: {
        ...createdDoc.relations.entityLinks,
        "link-1": {
          linkType: "interaction" as const,
          interactionId: "interaction-1",
          entityType: "account" as const,
          entityId: "account-1",
        },
        "link-2": {
          linkType: "note" as const,
          noteId: "note-1",
          entityType: "account" as const,
          entityId: "account-1",
        },
      },
    },
  };

  const deleted: Event = {
    id: "evt-interaction-2",
    type: "interaction.deleted",
    payload: {
      id: "interaction-1",
    },
    timestamp: "2024-06-03T00:00:00.000Z",
    deviceId: "device-1",
  };

  const deletedDoc = interactionReducer(docWithLink, deleted);

  assert.equal(deletedDoc.relations.entityLinks["link-1"], undefined);
  assert.ok(deletedDoc.relations.entityLinks["link-2"]);
});

test("interactionReducer rejects unhandled event types", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-interaction-1",
    type: "note.created",
    payload: {},
    timestamp: "2024-06-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => interactionReducer(doc, event), {
    message: "interaction.reducer does not handle event type: note.created",
  });
});
