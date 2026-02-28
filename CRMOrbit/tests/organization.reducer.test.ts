import assert from "node:assert/strict";

import { initAutomergeDoc } from "@automerge/init";
import { organizationReducer } from "@reducers/organization.reducer";
import type { Event } from "@events/event";

test("organization.created adds a new organization", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-1",
    type: "organization.created",
    payload: {
      id: "org-1",
      name: "Acme Corp",
      status: "organization.status.active",
      metadata: { region: "north" },
    },
    timestamp: "2024-01-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = organizationReducer(doc, event);
  const org = next.organizations["org-1"];

  assert.ok(org);
  assert.equal(org.id, "org-1");
  assert.equal(org.name, "Acme Corp");
  assert.equal(org.status, "organization.status.active");
  assert.equal(org.createdAt, event.timestamp);
  assert.equal(org.updatedAt, event.timestamp);
});

test("organization.created rejects duplicate ids", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-1",
    type: "organization.created",
    payload: {
      id: "org-1",
      name: "Acme Corp",
      status: "organization.status.active",
    },
    timestamp: "2024-01-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = organizationReducer(doc, event);

  assert.throws(() => organizationReducer(next, event), {
    message: "Organization already exists: org-1",
  });
});

test("organization.status.updated updates status and timestamp", () => {
  const doc = initAutomergeDoc();
  const created: Event = {
    id: "evt-1",
    type: "organization.created",
    payload: {
      id: "org-1",
      name: "Acme Corp",
      status: "organization.status.active",
    },
    timestamp: "2024-01-01T00:00:00.000Z",
    deviceId: "device-1",
  };
  const updated: Event = {
    id: "evt-2",
    type: "organization.status.updated",
    payload: {
      id: "org-1",
      status: "organization.status.inactive",
    },
    timestamp: "2024-02-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = organizationReducer(doc, created);
  const updatedDoc = organizationReducer(createdDoc, updated);
  const org = updatedDoc.organizations["org-1"];

  assert.equal(org.status, "organization.status.inactive");
  assert.equal(org.createdAt, created.timestamp);
  assert.equal(org.updatedAt, updated.timestamp);
});

test("organization.status.updated rejects missing organizations", () => {
  const doc = initAutomergeDoc();
  const updated: Event = {
    id: "evt-2",
    type: "organization.status.updated",
    payload: {
      id: "org-1",
      status: "organization.status.inactive",
    },
    timestamp: "2024-02-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => organizationReducer(doc, updated), {
    message: "Organization not found: org-1",
  });
});

test("organization.updated clears logo when logoUri is null", () => {
  const doc = initAutomergeDoc();
  const created: Event = {
    id: "evt-1",
    type: "organization.created",
    payload: {
      id: "org-1",
      name: "Acme Corp",
      status: "organization.status.active",
      logoUri: "file://logo.png",
    },
    timestamp: "2024-01-01T00:00:00.000Z",
    deviceId: "device-1",
  };
  const updated: Event = {
    id: "evt-2",
    type: "organization.updated",
    entityId: "org-1",
    payload: {
      id: "org-1",
      logoUri: null,
    },
    timestamp: "2024-02-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = organizationReducer(doc, created);
  const updatedDoc = organizationReducer(createdDoc, updated);
  const org = updatedDoc.organizations["org-1"];

  assert.ok(org);
  assert.equal(org.logoUri, undefined);
});

test("organization.deleted removes organization when no dependent accounts exist", () => {
  const doc = initAutomergeDoc();
  const created: Event = {
    id: "evt-1",
    type: "organization.created",
    payload: {
      id: "org-1",
      name: "Acme Corp",
      status: "organization.status.active",
    },
    timestamp: "2024-01-01T00:00:00.000Z",
    deviceId: "device-1",
  };
  const deleted: Event = {
    id: "evt-2",
    type: "organization.deleted",
    payload: {
      id: "org-1",
    },
    timestamp: "2024-02-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = organizationReducer(doc, created);
  const deletedDoc = organizationReducer(createdDoc, deleted);

  assert.equal(deletedDoc.organizations["org-1"], undefined);
});

test("organization.deleted rejects deletion when dependent accounts exist", () => {
  const doc = initAutomergeDoc();
  const created: Event = {
    id: "evt-1",
    type: "organization.created",
    payload: {
      id: "org-1",
      name: "Acme Corp",
      status: "organization.status.active",
    },
    timestamp: "2024-01-01T00:00:00.000Z",
    deviceId: "device-1",
  };
  const deleted: Event = {
    id: "evt-2",
    type: "organization.deleted",
    payload: {
      id: "org-1",
    },
    timestamp: "2024-02-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = organizationReducer(doc, created);
  const docWithAccount = {
    ...createdDoc,
    accounts: {
      ...createdDoc.accounts,
      "acct-1": {
        id: "acct-1" as const,
        organizationId: "org-1" as const,
        name: "Acme Account",
        status: "account.status.active" as const,
        auditFrequency: "account.auditFrequency.monthly" as const,
        auditFrequencyUpdatedAt: "2024-01-15T00:00:00.000Z",
        auditFrequencyAnchorAt: "2024-01-01T00:00:00.000Z",
        createdAt: "2024-01-15T00:00:00.000Z",
        updatedAt: "2024-01-15T00:00:00.000Z",
      },
    },
  };

  assert.throws(() => organizationReducer(docWithAccount, deleted), {
    message: "Cannot delete organization org-1: accounts still reference it",
  });
});

test("organization.updated rejects missing organization", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-1",
    type: "organization.updated",
    payload: {
      id: "org-missing",
      name: "Updated Name",
    },
    timestamp: "2024-01-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => organizationReducer(doc, event), {
    message: "Organization not found: org-missing",
  });
});

test("organization.updated sets inactiveAt when becoming inactive", () => {
  const doc = initAutomergeDoc();
  const created: Event = {
    id: "evt-1",
    type: "organization.created",
    payload: {
      id: "org-1",
      name: "Acme Corp",
      status: "organization.status.active",
    },
    timestamp: "2024-01-01T00:00:00.000Z",
    deviceId: "device-1",
  };
  const updated: Event = {
    id: "evt-2",
    type: "organization.updated",
    payload: {
      id: "org-1",
      status: "organization.status.inactive",
    },
    timestamp: "2024-02-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = organizationReducer(doc, created);
  const updatedDoc = organizationReducer(createdDoc, updated);
  const org = updatedDoc.organizations["org-1"];

  assert.equal(org.status, "organization.status.inactive");
  assert.equal(org.inactiveAt, "2024-02-01T00:00:00.000Z");
});

test("organization.updated clears inactiveAt when becoming active", () => {
  const doc = initAutomergeDoc();
  const created: Event = {
    id: "evt-1",
    type: "organization.created",
    payload: {
      id: "org-1",
      name: "Acme Corp",
      status: "organization.status.inactive",
    },
    timestamp: "2024-01-01T00:00:00.000Z",
    deviceId: "device-1",
  };
  const updated: Event = {
    id: "evt-2",
    type: "organization.updated",
    payload: {
      id: "org-1",
      status: "organization.status.active",
    },
    timestamp: "2024-02-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = organizationReducer(doc, created);
  // Manually set inactiveAt
  const docWithInactiveAt = {
    ...createdDoc,
    organizations: {
      ...createdDoc.organizations,
      "org-1": {
        ...createdDoc.organizations["org-1"],
        inactiveAt: "2024-01-01T00:00:00.000Z",
      },
    },
  };
  const updatedDoc = organizationReducer(docWithInactiveAt, updated);
  const org = updatedDoc.organizations["org-1"];

  assert.equal(org.status, "organization.status.active");
  assert.equal(org.inactiveAt, undefined);
});

test("organization.updated with explicit inactiveAt overrides auto-set", () => {
  const doc = initAutomergeDoc();
  const created: Event = {
    id: "evt-1",
    type: "organization.created",
    payload: {
      id: "org-1",
      name: "Acme Corp",
      status: "organization.status.active",
    },
    timestamp: "2024-01-01T00:00:00.000Z",
    deviceId: "device-1",
  };
  const updated: Event = {
    id: "evt-2",
    type: "organization.updated",
    payload: {
      id: "org-1",
      inactiveAt: "2024-01-15T00:00:00.000Z",
    },
    timestamp: "2024-02-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = organizationReducer(doc, created);
  const updatedDoc = organizationReducer(createdDoc, updated);
  const org = updatedDoc.organizations["org-1"];

  assert.equal(org.inactiveAt, "2024-01-15T00:00:00.000Z");
});

test("organization.updated updates name, status, and website", () => {
  const doc = initAutomergeDoc();
  const created: Event = {
    id: "evt-1",
    type: "organization.created",
    payload: {
      id: "org-1",
      name: "Acme Corp",
      status: "organization.status.active",
    },
    timestamp: "2024-01-01T00:00:00.000Z",
    deviceId: "device-1",
  };
  const updated: Event = {
    id: "evt-2",
    type: "organization.updated",
    payload: {
      id: "org-1",
      name: "Acme Corporation",
      status: "organization.status.active",
      website: "https://acme.com",
    },
    timestamp: "2024-02-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = organizationReducer(doc, created);
  const updatedDoc = organizationReducer(createdDoc, updated);
  const org = updatedDoc.organizations["org-1"];

  assert.equal(org.name, "Acme Corporation");
  assert.equal(org.website, "https://acme.com");
  assert.equal(org.updatedAt, "2024-02-01T00:00:00.000Z");
});

test("organization.updated updates activeAt", () => {
  const doc = initAutomergeDoc();
  const created: Event = {
    id: "evt-1",
    type: "organization.created",
    payload: {
      id: "org-1",
      name: "Acme Corp",
      status: "organization.status.active",
    },
    timestamp: "2024-01-01T00:00:00.000Z",
    deviceId: "device-1",
  };
  const updated: Event = {
    id: "evt-2",
    type: "organization.updated",
    payload: {
      id: "org-1",
      activeAt: "2023-12-15T00:00:00.000Z",
    },
    timestamp: "2024-02-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = organizationReducer(doc, created);
  const updatedDoc = organizationReducer(createdDoc, updated);
  const org = updatedDoc.organizations["org-1"];

  assert.equal(org.activeAt, "2023-12-15T00:00:00.000Z");
});

test("organization.updated updates socialMedia", () => {
  const doc = initAutomergeDoc();
  const created: Event = {
    id: "evt-1",
    type: "organization.created",
    payload: {
      id: "org-1",
      name: "Acme Corp",
      status: "organization.status.active",
    },
    timestamp: "2024-01-01T00:00:00.000Z",
    deviceId: "device-1",
  };
  const updated: Event = {
    id: "evt-2",
    type: "organization.updated",
    payload: {
      id: "org-1",
      socialMedia: {
        linkedin: "https://linkedin.com/company/acme",
      },
    },
    timestamp: "2024-02-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = organizationReducer(doc, created);
  const updatedDoc = organizationReducer(createdDoc, updated);
  const org = updatedDoc.organizations["org-1"];

  assert.deepEqual(org.socialMedia, {
    linkedin: "https://linkedin.com/company/acme",
  });
});

test("organization.status.updated sets inactiveAt when becoming inactive", () => {
  const doc = initAutomergeDoc();
  const created: Event = {
    id: "evt-1",
    type: "organization.created",
    payload: {
      id: "org-1",
      name: "Acme Corp",
      status: "organization.status.active",
    },
    timestamp: "2024-01-01T00:00:00.000Z",
    deviceId: "device-1",
  };
  const updated: Event = {
    id: "evt-2",
    type: "organization.status.updated",
    payload: {
      id: "org-1",
      status: "organization.status.inactive",
    },
    timestamp: "2024-02-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = organizationReducer(doc, created);
  const updatedDoc = organizationReducer(createdDoc, updated);
  const org = updatedDoc.organizations["org-1"];

  assert.equal(org.status, "organization.status.inactive");
  assert.equal(org.inactiveAt, "2024-02-01T00:00:00.000Z");
});

test("organization.status.updated clears inactiveAt when becoming active", () => {
  const doc = initAutomergeDoc();
  const created: Event = {
    id: "evt-1",
    type: "organization.created",
    payload: {
      id: "org-1",
      name: "Acme Corp",
      status: "organization.status.inactive",
    },
    timestamp: "2024-01-01T00:00:00.000Z",
    deviceId: "device-1",
  };
  const updated: Event = {
    id: "evt-2",
    type: "organization.status.updated",
    payload: {
      id: "org-1",
      status: "organization.status.active",
    },
    timestamp: "2024-02-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = organizationReducer(doc, created);
  const docWithInactiveAt = {
    ...createdDoc,
    organizations: {
      ...createdDoc.organizations,
      "org-1": {
        ...createdDoc.organizations["org-1"],
        inactiveAt: "2024-01-01T00:00:00.000Z",
      },
    },
  };
  const updatedDoc = organizationReducer(docWithInactiveAt, updated);
  const org = updatedDoc.organizations["org-1"];

  assert.equal(org.status, "organization.status.active");
  assert.equal(org.inactiveAt, undefined);
});

test("organization.status.updated with effectiveAt sets backdated inactiveAt", () => {
  const doc = initAutomergeDoc();
  const created: Event = {
    id: "evt-1",
    type: "organization.created",
    payload: {
      id: "org-1",
      name: "Acme Corp",
      status: "organization.status.active",
    },
    timestamp: "2024-01-01T00:00:00.000Z",
    deviceId: "device-1",
  };
  const updated: Event = {
    id: "evt-2",
    type: "organization.status.updated",
    payload: {
      id: "org-1",
      status: "organization.status.inactive",
      effectiveAt: "2024-01-15T00:00:00.000Z",
    },
    timestamp: "2024-02-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  const createdDoc = organizationReducer(doc, created);
  const updatedDoc = organizationReducer(createdDoc, updated);
  const org = updatedDoc.organizations["org-1"];

  assert.equal(org.status, "organization.status.inactive");
  assert.equal(org.inactiveAt, "2024-01-15T00:00:00.000Z");
});

test("organization.deleted rejects missing organization", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-1",
    type: "organization.deleted",
    payload: {
      id: "org-missing",
    },
    timestamp: "2024-01-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => organizationReducer(doc, event), {
    message: "Organization not found: org-missing",
  });
});

test("organizationReducer rejects unhandled event types", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-1",
    type: "organization.unknown",
    payload: {},
    timestamp: "2024-01-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => organizationReducer(doc, event), {
    message:
      "organization.reducer does not handle event type: organization.unknown",
  });
});
