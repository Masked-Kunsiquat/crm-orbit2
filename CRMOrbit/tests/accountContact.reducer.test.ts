import assert from "node:assert/strict";

import { initAutomergeDoc } from "@automerge/init";
import { accountContactReducer } from "@reducers/accountContact.reducer";
import { accountReducer } from "@reducers/account.reducer";
import { contactReducer } from "@reducers/contact.reducer";
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
  timestamp: "2024-01-01T00:00:00.000Z",
  deviceId: "device-1",
});

const createAccount = (): Event => ({
  id: "evt-acct-1",
  type: "account.created",
  payload: {
    id: "acct-1",
    organizationId: "org-1",
    name: "ACME Retail",
    status: "account.status.active",
  },
  timestamp: "2024-01-02T00:00:00.000Z",
  deviceId: "device-1",
});

const createContact = (id: string, name: string): Event => ({
  id: `evt-contact-${id}`,
  type: "contact.created",
  payload: {
    id,
    type: "contact.type.internal",
    name,
    methods: {
      emails: [],
      phones: [],
    },
  },
  timestamp: "2024-01-03T00:00:00.000Z",
  deviceId: "device-1",
});

const baseDoc = () => {
  const doc = initAutomergeDoc();
  const orgDoc = organizationReducer(doc, createOrganization());
  const accountDoc = accountReducer(orgDoc, createAccount());
  return accountDoc;
};

test("account.contact.linked creates a relation", () => {
  const doc = baseDoc();
  const contactDoc = contactReducer(doc, createContact("contact-1", "Jordan"));
  const event: Event = {
    id: "evt-link-1",
    type: "account.contact.linked",
    payload: {
      id: "rel-1",
      accountId: "acct-1",
      contactId: "contact-1",
      role: "account.contact.role.primary",
      isPrimary: true,
    },
    timestamp: "2024-01-04T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = accountContactReducer(contactDoc, event);
  const relation = next.relations.accountContacts["rel-1"];

  assert.ok(relation);
  assert.equal(relation.accountId, "acct-1");
  assert.equal(relation.contactId, "contact-1");
  assert.equal(relation.role, "account.contact.role.primary");
  assert.equal(relation.isPrimary, true);
});

test("account.contact.linked rejects missing account", () => {
  const doc = initAutomergeDoc();
  const contactDoc = contactReducer(doc, createContact("contact-1", "Jordan"));
  const event: Event = {
    id: "evt-link-1",
    type: "account.contact.linked",
    payload: {
      id: "rel-1",
      accountId: "acct-1",
      contactId: "contact-1",
      role: "account.contact.role.primary",
    },
    timestamp: "2024-01-04T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => accountContactReducer(contactDoc, event), {
    message: "Account not found: acct-1",
  });
});

test("account.contact.linked rejects missing contact", () => {
  const doc = baseDoc();
  const event: Event = {
    id: "evt-link-1",
    type: "account.contact.linked",
    payload: {
      id: "rel-1",
      accountId: "acct-1",
      contactId: "contact-1",
      role: "account.contact.role.primary",
    },
    timestamp: "2024-01-04T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => accountContactReducer(doc, event), {
    message: "Contact not found: contact-1",
  });
});

test("account.contact.linked rejects duplicate relation", () => {
  const doc = baseDoc();
  const contactDoc = contactReducer(doc, createContact("contact-1", "Jordan"));
  const event: Event = {
    id: "evt-link-1",
    type: "account.contact.linked",
    payload: {
      id: "rel-1",
      accountId: "acct-1",
      contactId: "contact-1",
      role: "account.contact.role.primary",
    },
    timestamp: "2024-01-04T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = accountContactReducer(contactDoc, event);

  assert.throws(() => accountContactReducer(next, event), {
    message: "AccountContact relation already exists: rel-1",
  });
});

test("account.contact.setPrimary sets a single primary for role", () => {
  const doc = baseDoc();
  const withContactA = contactReducer(
    doc,
    createContact("contact-1", "Jordan"),
  );
  const withContactB = contactReducer(
    withContactA,
    createContact("contact-2", "Taylor"),
  );
  const linkedA: Event = {
    id: "evt-link-1",
    type: "account.contact.linked",
    payload: {
      id: "rel-1",
      accountId: "acct-1",
      contactId: "contact-1",
      role: "account.contact.role.primary",
      isPrimary: true,
    },
    timestamp: "2024-01-04T00:00:00.000Z",
    deviceId: "device-1",
  };
  const linkedB: Event = {
    id: "evt-link-2",
    type: "account.contact.linked",
    payload: {
      id: "rel-2",
      accountId: "acct-1",
      contactId: "contact-2",
      role: "account.contact.role.primary",
      isPrimary: false,
    },
    timestamp: "2024-01-05T00:00:00.000Z",
    deviceId: "device-1",
  };
  const setPrimary: Event = {
    id: "evt-primary-1",
    type: "account.contact.setPrimary",
    payload: {
      id: "rel-2",
      accountId: "acct-1",
      contactId: "contact-2",
      role: "account.contact.role.primary",
    },
    timestamp: "2024-01-06T00:00:00.000Z",
    deviceId: "device-1",
  };

  const withRelA = accountContactReducer(withContactB, linkedA);
  const withRelB = accountContactReducer(withRelA, linkedB);
  const next = accountContactReducer(withRelB, setPrimary);

  assert.equal(next.relations.accountContacts["rel-1"]?.isPrimary, false);
  assert.equal(next.relations.accountContacts["rel-2"]?.isPrimary, true);
});

test("account.contact.unsetPrimary clears primary flag", () => {
  const doc = baseDoc();
  const contactDoc = contactReducer(doc, createContact("contact-1", "Jordan"));
  const linked: Event = {
    id: "evt-link-1",
    type: "account.contact.linked",
    payload: {
      id: "rel-1",
      accountId: "acct-1",
      contactId: "contact-1",
      role: "account.contact.role.primary",
      isPrimary: true,
    },
    timestamp: "2024-01-04T00:00:00.000Z",
    deviceId: "device-1",
  };
  const unsetPrimary: Event = {
    id: "evt-primary-1",
    type: "account.contact.unsetPrimary",
    payload: {
      id: "rel-1",
      accountId: "acct-1",
      contactId: "contact-1",
      role: "account.contact.role.primary",
    },
    timestamp: "2024-01-06T00:00:00.000Z",
    deviceId: "device-1",
  };

  const withRel = accountContactReducer(contactDoc, linked);
  const next = accountContactReducer(withRel, unsetPrimary);

  assert.equal(next.relations.accountContacts["rel-1"]?.isPrimary, false);
});
