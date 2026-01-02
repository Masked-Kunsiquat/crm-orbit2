import assert from "node:assert/strict";

import { initAutomergeDoc } from "@automerge/init";
import { noteReducer } from "@reducers/note.reducer";
import type { Event } from "@events/event";

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

test("note.deleted removes note from state", () => {
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
  const deleted: Event = {
    id: "evt-note-2",
    type: "note.deleted",
    payload: {
      id: "note-1",
    },
    timestamp: "2024-04-02T00:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = noteReducer(doc, created);
  assert.ok(createdDoc.notes["note-1"], "Note should exist after creation");

  const deletedDoc = noteReducer(createdDoc, deleted);
  assert.equal(
    deletedDoc.notes["note-1"],
    undefined,
    "Note should be removed from state",
  );
  assert.equal(
    Object.keys(deletedDoc.notes).length,
    0,
    "Notes object should be empty",
  );
});

test("note.deleted removes all related noteLinks", () => {
  // Initialize document with a note and multiple noteLinks
  let doc = initAutomergeDoc();

  // Create a note
  const noteCreated: Event = {
    id: "evt-note-1",
    type: "note.created",
    payload: {
      id: "note-1",
      title: "Meeting notes",
      body: "Important meeting",
    },
    timestamp: "2024-04-01T00:00:00.000Z",
    deviceId: "device-1",
  };
  doc = noteReducer(doc, noteCreated);

  // Manually add noteLinks that reference this note
  doc.relations.noteLinks["link-1"] = {
    noteId: "note-1",
    entityType: "organization",
    entityId: "org-1",
  };
  doc.relations.noteLinks["link-2"] = {
    noteId: "note-1",
    entityType: "account",
    entityId: "acc-1",
  };
  doc.relations.noteLinks["link-3"] = {
    noteId: "note-1",
    entityType: "contact",
    entityId: "contact-1",
  };
  // Add a link for a different note to ensure it's preserved
  doc.relations.noteLinks["link-4"] = {
    noteId: "note-2",
    entityType: "organization",
    entityId: "org-2",
  };

  assert.equal(
    Object.keys(doc.relations.noteLinks).length,
    4,
    "Should have 4 noteLinks before deletion",
  );

  // Delete the note
  const noteDeleted: Event = {
    id: "evt-note-2",
    type: "note.deleted",
    payload: {
      id: "note-1",
    },
    timestamp: "2024-04-02T00:00:00.000Z",
    deviceId: "device-1",
  };

  const result = noteReducer(doc, noteDeleted);

  // Assert note is removed
  assert.equal(
    result.notes["note-1"],
    undefined,
    "Note should be removed from state",
  );

  // Assert all noteLinks referencing the deleted note are removed
  assert.equal(
    result.relations.noteLinks["link-1"],
    undefined,
    "NoteLink link-1 should be removed",
  );
  assert.equal(
    result.relations.noteLinks["link-2"],
    undefined,
    "NoteLink link-2 should be removed",
  );
  assert.equal(
    result.relations.noteLinks["link-3"],
    undefined,
    "NoteLink link-3 should be removed",
  );

  // Assert noteLinks for other notes are preserved
  assert.ok(
    result.relations.noteLinks["link-4"],
    "NoteLink link-4 for different note should be preserved",
  );
  assert.equal(
    result.relations.noteLinks["link-4"].noteId,
    "note-2",
    "Preserved link should still reference note-2",
  );

  // Assert overall state consistency
  assert.equal(
    Object.keys(result.relations.noteLinks).length,
    1,
    "Should have 1 noteLink remaining (link-4)",
  );
});

test("note.deleted maintains state consistency with no dangling references", () => {
  // Initialize document with multiple notes and noteLinks
  let doc = initAutomergeDoc();

  // Create two notes
  const note1Created: Event = {
    id: "evt-note-1",
    type: "note.created",
    payload: {
      id: "note-1",
      title: "First note",
      body: "First note body",
    },
    timestamp: "2024-04-01T00:00:00.000Z",
    deviceId: "device-1",
  };
  const note2Created: Event = {
    id: "evt-note-2",
    type: "note.created",
    payload: {
      id: "note-2",
      title: "Second note",
      body: "Second note body",
    },
    timestamp: "2024-04-01T01:00:00.000Z",
    deviceId: "device-1",
  };

  doc = noteReducer(doc, note1Created);
  doc = noteReducer(doc, note2Created);

  // Add multiple noteLinks for note-1 and note-2
  doc.relations.noteLinks["link-1"] = {
    noteId: "note-1",
    entityType: "organization",
    entityId: "org-1",
  };
  doc.relations.noteLinks["link-2"] = {
    noteId: "note-1",
    entityType: "account",
    entityId: "acc-1",
  };
  doc.relations.noteLinks["link-3"] = {
    noteId: "note-2",
    entityType: "contact",
    entityId: "contact-1",
  };
  doc.relations.noteLinks["link-4"] = {
    noteId: "note-2",
    entityType: "interaction",
    entityId: "int-1",
  };

  const initialNotesCount = Object.keys(doc.notes).length;
  const initialLinksCount = Object.keys(doc.relations.noteLinks).length;

  assert.equal(initialNotesCount, 2, "Should have 2 notes initially");
  assert.equal(initialLinksCount, 4, "Should have 4 noteLinks initially");

  // Delete note-1
  const note1Deleted: Event = {
    id: "evt-note-3",
    type: "note.deleted",
    payload: {
      id: "note-1",
    },
    timestamp: "2024-04-02T00:00:00.000Z",
    deviceId: "device-1",
  };

  const result = noteReducer(doc, note1Deleted);

  // Verify note-1 is removed
  assert.equal(result.notes["note-1"], undefined, "note-1 should be removed");

  // Verify note-2 is preserved
  assert.ok(result.notes["note-2"], "note-2 should still exist");
  assert.equal(result.notes["note-2"].title, "Second note");

  // Verify counts reflect the removal
  assert.equal(
    Object.keys(result.notes).length,
    1,
    "Should have 1 note remaining",
  );
  assert.equal(
    Object.keys(result.relations.noteLinks).length,
    2,
    "Should have 2 noteLinks remaining (for note-2)",
  );

  // Verify no dangling references exist
  const remainingLinkIds = Object.keys(result.relations.noteLinks);
  for (const linkId of remainingLinkIds) {
    const link = result.relations.noteLinks[linkId];
    assert.notEqual(
      link.noteId,
      "note-1",
      `Link ${linkId} should not reference deleted note-1`,
    );
    assert.ok(
      result.notes[link.noteId],
      `Link ${linkId} should reference an existing note`,
    );
  }

  // Verify relations object structure is preserved
  assert.ok(result.relations, "Relations object should exist");
  assert.ok(result.relations.noteLinks, "noteLinks object should exist");
  assert.ok(
    result.relations.accountContacts,
    "accountContacts object should be preserved",
  );

  // Verify the specific noteLinks that should remain
  assert.ok(
    result.relations.noteLinks["link-3"],
    "link-3 for note-2 should be preserved",
  );
  assert.ok(
    result.relations.noteLinks["link-4"],
    "link-4 for note-2 should be preserved",
  );
  assert.equal(
    result.relations.noteLinks["link-1"],
    undefined,
    "link-1 for note-1 should be removed",
  );
  assert.equal(
    result.relations.noteLinks["link-2"],
    undefined,
    "link-2 for note-1 should be removed",
  );
});

test("note.deleted rejects missing notes", () => {
  const doc = initAutomergeDoc();
  const deleted: Event = {
    id: "evt-note-1",
    type: "note.deleted",
    payload: {
      id: "note-1",
    },
    timestamp: "2024-04-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => noteReducer(doc, deleted), {
    message: "Note not found: note-1",
  });
});
