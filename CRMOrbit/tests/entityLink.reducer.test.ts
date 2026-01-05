import assert from "node:assert/strict";

import { initAutomergeDoc } from "@automerge/init";
import { entityLinkReducer } from "@reducers/entityLink.reducer";
import { noteReducer } from "@reducers/note.reducer";
import { interactionReducer } from "@reducers/interaction.reducer";
import { organizationReducer } from "@reducers/organization.reducer";
import { accountReducer } from "@reducers/account.reducer";
import { auditReducer } from "@reducers/audit.reducer";
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

const createInteraction = (): Event => ({
  id: "evt-interaction-1",
  type: "interaction.logged",
  payload: {
    id: "interaction-1",
    type: "interaction.type.call",
    occurredAt: "2024-05-02T12:00:00.000Z",
    summary: "Intro call",
  },
  timestamp: "2024-05-02T12:00:00.000Z",
  deviceId: "device-1",
});

const createAccount = (): Event => ({
  id: "evt-account-1",
  type: "account.created",
  payload: {
    id: "account-1",
    organizationId: "org-1",
    name: "Acme Account",
    status: "account.status.active",
  },
  timestamp: "2024-05-02T09:00:00.000Z",
  deviceId: "device-1",
});

const createAudit = (): Event => ({
  id: "evt-audit-1",
  type: "audit.created",
  payload: {
    id: "audit-1",
    accountId: "account-1",
    scheduledFor: "2024-05-05T09:00:00.000Z",
  },
  timestamp: "2024-05-04T09:00:00.000Z",
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

  const next = entityLinkReducer(withNote, event);
  const link = next.relations.entityLinks["link-1"];

  assert.ok(link);
  assert.equal(link.linkType, "note");
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

  assert.throws(() => entityLinkReducer(withOrg, event), {
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

  assert.throws(() => entityLinkReducer(withNote, event), {
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

  const next = entityLinkReducer(withNote, event);

  assert.throws(() => entityLinkReducer(next, event), {
    message: "EntityLink already exists: link-1",
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

  const withLink = entityLinkReducer(withNote, linked);
  const next = entityLinkReducer(withLink, unlinked);

  assert.equal(next.relations.entityLinks["link-1"], undefined);
});

test("interaction.linked creates a link", () => {
  const doc = initAutomergeDoc();
  const withOrg = organizationReducer(doc, createOrganization());
  const withInteraction = interactionReducer(withOrg, createInteraction());
  const event: Event = {
    id: "evt-link-2",
    type: "interaction.linked",
    payload: {
      id: "link-2",
      interactionId: "interaction-1",
      entityType: "organization",
      entityId: "org-1",
    },
    timestamp: "2024-05-03T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = entityLinkReducer(withInteraction, event);
  const link = next.relations.entityLinks["link-2"];

  assert.ok(link);
  assert.equal(link.linkType, "interaction");
  assert.equal(link.interactionId, "interaction-1");
  assert.equal(link.entityType, "organization");
  assert.equal(link.entityId, "org-1");
});

test("note.unlinked uses event.entityId when payload is empty", () => {
  const doc = initAutomergeDoc();
  const withOrg = organizationReducer(doc, createOrganization());
  const withNote = noteReducer(withOrg, createNote());
  const linked: Event = {
    id: "evt-link-3",
    type: "note.linked",
    payload: {
      id: "link-3",
      noteId: "note-1",
      entityType: "organization",
      entityId: "org-1",
    },
    timestamp: "2024-05-03T00:00:00.000Z",
    deviceId: "device-1",
  };
  const unlinked: Event = {
    id: "evt-link-4",
    type: "note.unlinked",
    entityId: "link-3",
    payload: {},
    timestamp: "2024-05-04T00:00:00.000Z",
    deviceId: "device-1",
  };

  const withLink = entityLinkReducer(withNote, linked);
  const next = entityLinkReducer(withLink, unlinked);

  assert.equal(next.relations.entityLinks["link-3"], undefined);
});

test("interaction.unlinked uses event.entityId with partial payload", () => {
  const doc = initAutomergeDoc();
  const withOrg = organizationReducer(doc, createOrganization());
  const withInteraction = interactionReducer(withOrg, createInteraction());
  const linked: Event = {
    id: "evt-link-5",
    type: "interaction.linked",
    payload: {
      id: "link-5",
      interactionId: "interaction-1",
      entityType: "organization",
      entityId: "org-1",
    },
    timestamp: "2024-05-03T00:00:00.000Z",
    deviceId: "device-1",
  };
  const unlinked: Event = {
    id: "evt-link-6",
    type: "interaction.unlinked",
    entityId: "link-5",
    payload: {
      interactionId: "interaction-1",
    },
    timestamp: "2024-05-04T00:00:00.000Z",
    deviceId: "device-1",
  };

  const withLink = entityLinkReducer(withInteraction, linked);
  const next = entityLinkReducer(withLink, unlinked);

  assert.equal(next.relations.entityLinks["link-5"], undefined);
});

test("interaction.unlinked ignores missing entityType when entityId is present", () => {
  const doc = initAutomergeDoc();
  const withOrg = organizationReducer(doc, createOrganization());
  const withInteraction = interactionReducer(withOrg, createInteraction());
  const linked: Event = {
    id: "evt-link-7",
    type: "interaction.linked",
    payload: {
      id: "link-7",
      interactionId: "interaction-1",
      entityType: "organization",
      entityId: "org-1",
    },
    timestamp: "2024-05-03T00:00:00.000Z",
    deviceId: "device-1",
  };
  const unlinked: Event = {
    id: "evt-link-8",
    type: "interaction.unlinked",
    entityId: "link-7",
    payload: {
      entityType: "organization",
    },
    timestamp: "2024-05-04T00:00:00.000Z",
    deviceId: "device-1",
  };

  const withLink = entityLinkReducer(withInteraction, linked);
  const next = entityLinkReducer(withLink, unlinked);

  assert.equal(next.relations.entityLinks["link-7"], undefined);
});

test("note.linked supports audit entities", () => {
  const doc = initAutomergeDoc();
  const withOrg = organizationReducer(doc, createOrganization());
  const withAccount = accountReducer(withOrg, createAccount());
  const withAudit = auditReducer(withAccount, createAudit());
  const withNote = noteReducer(withAudit, createNote());
  const linked: Event = {
    id: "evt-link-9",
    type: "note.linked",
    payload: {
      id: "link-9",
      noteId: "note-1",
      entityType: "audit",
      entityId: "audit-1",
    },
    timestamp: "2024-05-06T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = entityLinkReducer(withNote, linked);
  const link = next.relations.entityLinks["link-9"];

  assert.ok(link);
  assert.equal(link.linkType, "note");
  assert.equal(link.entityType, "audit");
  assert.equal(link.entityId, "audit-1");
});
