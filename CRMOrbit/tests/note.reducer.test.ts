import assert from "node:assert/strict";

import { initAutomergeDoc } from "../crm-core/automerge/init";
import { noteReducer } from "../crm-core/reducers/note.reducer";
import type { Event } from "../crm-core/events/event";

test("note.created adds a new note", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-note-1",
    type: "note.created",
    payload: {
      id: "note-1",
      title: "Kickoff",
      body: "Met with the client to discuss scope.",
    },
    timestamp: "2024-04-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = noteReducer(doc, event);
  const note = next.notes["note-1"];

  assert.ok(note);
  assert.equal(note.title, "Kickoff");
  assert.equal(note.body, "Met with the client to discuss scope.");
  assert.equal(note.createdAt, event.timestamp);
  assert.equal(note.updatedAt, event.timestamp);
});

test("note.created rejects duplicates", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-note-1",
    type: "note.created",
    payload: {
      id: "note-1",
      title: "Kickoff",
      body: "Met with the client to discuss scope.",
    },
    timestamp: "2024-04-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = noteReducer(doc, event);

  assert.throws(() => noteReducer(next, event), {
    message: "Note already exists: note-1",
  });
});

test("note.updated modifies title/body and bumps timestamp", () => {
  const doc = initAutomergeDoc();
  const created: Event = {
    id: "evt-note-1",
    type: "note.created",
    payload: {
      id: "note-1",
      title: "Kickoff",
      body: "Met with the client to discuss scope.",
    },
    timestamp: "2024-04-01T00:00:00.000Z",
    deviceId: "device-1",
  };
  const updated: Event = {
    id: "evt-note-2",
    type: "note.updated",
    payload: {
      id: "note-1",
      title: "Kickoff + next steps",
      body: "Met with the client; agreed on next steps.",
    },
    timestamp: "2024-04-02T00:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = noteReducer(doc, created);
  const updatedDoc = noteReducer(createdDoc, updated);
  const note = updatedDoc.notes["note-1"];

  assert.equal(note.title, "Kickoff + next steps");
  assert.equal(note.body, "Met with the client; agreed on next steps.");
  assert.equal(note.createdAt, created.timestamp);
  assert.equal(note.updatedAt, updated.timestamp);
});

test("note.updated rejects missing notes", () => {
  const doc = initAutomergeDoc();
  const updated: Event = {
    id: "evt-note-2",
    type: "note.updated",
    payload: {
      id: "note-1",
      title: "Kickoff + next steps",
    },
    timestamp: "2024-04-02T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => noteReducer(doc, updated), {
    message: "Note not found: note-1",
  });
});
