import assert from "node:assert/strict";

import { initAutomergeDoc } from "@automerge/init";
import { noteLinkReducer } from "@reducers/noteLink.reducer";
import { noteReducer } from "@reducers/note.reducer";
import { organizationReducer } from "@reducers/organization.reducer";
import type { Event } from "@events/event";

const createOrganization = (): Event => ({
  id: "evt-org-1",
  type: "organization.created",
  payload: {
    id: "org-1",
    name: "Acme Corp",
    status: "organization.status.active",
  },
  timestamp: "2024-05-01T00:00:00.000Z",
  deviceId: "device-1",
});

const createNote = (): Event => ({
  id: "evt-note-1",
  type: "note.created",
  payload: {
    id: "note-1",
    title: "Kickoff",
    body: "Initial meeting notes.",
  },
  timestamp: "2024-05-02T00:00:00.000Z",
  deviceId: "device-1",
});

test("note.linked creates a link", () => {
  const doc = initAutomergeDoc();
  const withOrg = organizationReducer(doc, createOrganization());
  const withNote = noteReducer(withOrg, createNote());
  const event: Event = {
    id: "evt-link-1",
    type: "note.linked",
    payload: {
      id: "link-1",
      noteId: "note-1",
      entityType: "organization",
      entityId: "org-1",
    },
    timestamp: "2024-05-03T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = noteLinkReducer(withNote, event);
  const link = next.relations.noteLinks["link-1"];

  assert.ok(link);
  assert.equal(link.noteId, "note-1");
  assert.equal(link.entityType, "organization");
  assert.equal(link.entityId, "org-1");
});

test("note.linked rejects missing notes", () => {
  const doc = initAutomergeDoc();
  const withOrg = organizationReducer(doc, createOrganization());
  const event: Event = {
    id: "evt-link-1",
    type: "note.linked",
    payload: {
      id: "link-1",
      noteId: "note-1",
      entityType: "organization",
      entityId: "org-1",
    },
    timestamp: "2024-05-03T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => noteLinkReducer(withOrg, event), {
    message: "Note not found: note-1",
  });
});

test("note.linked rejects missing entities", () => {
  const doc = initAutomergeDoc();
  const withNote = noteReducer(doc, createNote());
  const event: Event = {
    id: "evt-link-1",
    type: "note.linked",
    payload: {
      id: "link-1",
      noteId: "note-1",
      entityType: "organization",
      entityId: "org-1",
    },
    timestamp: "2024-05-03T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => noteLinkReducer(withNote, event), {
    message: "Organization not found: org-1",
  });
});

test("note.linked rejects duplicate links", () => {
  const doc = initAutomergeDoc();
  const withOrg = organizationReducer(doc, createOrganization());
  const withNote = noteReducer(withOrg, createNote());
  const event: Event = {
    id: "evt-link-1",
    type: "note.linked",
    payload: {
      id: "link-1",
      noteId: "note-1",
      entityType: "organization",
      entityId: "org-1",
    },
    timestamp: "2024-05-03T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = noteLinkReducer(withNote, event);

  assert.throws(() => noteLinkReducer(next, event), {
    message: "NoteLink already exists: link-1",
  });
});

test("note.unlinked removes a link", () => {
  const doc = initAutomergeDoc();
  const withOrg = organizationReducer(doc, createOrganization());
  const withNote = noteReducer(withOrg, createNote());
  const linked: Event = {
    id: "evt-link-1",
    type: "note.linked",
    payload: {
      id: "link-1",
      noteId: "note-1",
      entityType: "organization",
      entityId: "org-1",
    },
    timestamp: "2024-05-03T00:00:00.000Z",
    deviceId: "device-1",
  };
  const unlinked: Event = {
    id: "evt-link-2",
    type: "note.unlinked",
    payload: {
      id: "link-1",
      noteId: "note-1",
      entityType: "organization",
      entityId: "org-1",
    },
    timestamp: "2024-05-04T00:00:00.000Z",
    deviceId: "device-1",
  };

  const withLink = noteLinkReducer(withNote, linked);
  const next = noteLinkReducer(withLink, unlinked);

  assert.equal(next.relations.noteLinks["link-1"], undefined);
});
