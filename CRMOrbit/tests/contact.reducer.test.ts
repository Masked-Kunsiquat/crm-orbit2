import assert from "node:assert/strict";

import { initAutomergeDoc } from "@automerge/init";
import { contactReducer } from "@reducers/contact.reducer";
import type { Event } from "@events/event";

const baseContactEvent = (): Event => ({
  id: "evt-contact-1",
  type: "contact.created",
  payload: {
    id: "contact-1",
    type: "contact.type.internal",
    name: "Jordan Smith",
    methods: {
      emails: [
        {
          id: "contact-method-1",
          value: "jordan@example.com",
          label: "contact.method.label.work",
          status: "contact.method.status.active",
        },
      ],
      phones: [],
    },
  },
  timestamp: "2024-03-01T00:00:00.000Z",
  deviceId: "device-1",
});

test("contact.created adds a new contact", () => {
  const doc = initAutomergeDoc();
  const event = baseContactEvent();

  const next = contactReducer(doc, event);
  const contact = next.contacts["contact-1"];

  assert.ok(contact);
  assert.equal(contact.name, "Jordan Smith");
  assert.equal(contact.type, "contact.type.internal");
  assert.equal(contact.methods.emails.length, 1);
  assert.equal(contact.methods.phones.length, 0);
  assert.equal(contact.createdAt, event.timestamp);
  assert.equal(contact.updatedAt, event.timestamp);
});

test("contact.created rejects duplicate ids", () => {
  const doc = initAutomergeDoc();
  const event = baseContactEvent();
  const next = contactReducer(doc, event);

  assert.throws(() => contactReducer(next, event), {
    message: "Contact already exists: contact-1",
  });
});

test("contact.method.added appends a method", () => {
  const doc = initAutomergeDoc();
  const created = contactReducer(doc, baseContactEvent());
  const event: Event = {
    id: "evt-contact-2",
    type: "contact.method.added",
    payload: {
      id: "contact-1",
      methodType: "phones",
      method: {
        id: "contact-method-2",
        value: "+1-555-0100",
        label: "contact.method.label.work",
        status: "contact.method.status.active",
      },
    },
    timestamp: "2024-03-02T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = contactReducer(created, event);
  const contact = next.contacts["contact-1"];

  assert.equal(contact.methods.phones.length, 1);
  assert.equal(contact.methods.phones[0]?.value, "+1-555-0100");
  assert.equal(contact.updatedAt, event.timestamp);
});

test("contact.method.updated replaces a method by index", () => {
  const doc = initAutomergeDoc();
  const created = contactReducer(doc, baseContactEvent());
  const event: Event = {
    id: "evt-contact-3",
    type: "contact.method.updated",
    payload: {
      id: "contact-1",
      methodType: "emails",
      index: 0,
      method: {
        id: "contact-method-1",
        value: "jordan.smith@example.com",
        label: "contact.method.label.work",
        status: "contact.method.status.active",
      },
    },
    timestamp: "2024-03-03T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = contactReducer(created, event);
  const contact = next.contacts["contact-1"];

  assert.equal(contact.methods.emails.length, 1);
  assert.equal(contact.methods.emails[0]?.value, "jordan.smith@example.com");
  assert.equal(contact.updatedAt, event.timestamp);
});

test("contact.method.updated rejects out-of-bounds index", () => {
  const doc = initAutomergeDoc();
  const created = contactReducer(doc, baseContactEvent());
  const event: Event = {
    id: "evt-contact-4",
    type: "contact.method.updated",
    payload: {
      id: "contact-1",
      methodType: "emails",
      index: 2,
      method: {
        id: "contact-method-1",
        value: "jordan.smith@example.com",
        label: "contact.method.label.work",
        status: "contact.method.status.active",
      },
    },
    timestamp: "2024-03-03T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => contactReducer(created, event), {
    message: "Contact method index out of bounds: 2",
  });
});

test("contact.created rejects missing methods", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-contact-5",
    type: "contact.created",
    payload: {
      id: "contact-2",
      type: "contact.type.internal",
      name: "Test Contact",
      methods: {},
    },
    timestamp: "2024-03-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => contactReducer(doc, event), {
    message: "Contact methods must include emails and phones arrays.",
  });
});

test("contact.method.added rejects invalid method type", () => {
  const doc = initAutomergeDoc();
  const created = contactReducer(doc, baseContactEvent());
  const event: Event = {
    id: "evt-contact-6",
    type: "contact.method.added",
    payload: {
      id: "contact-1",
      methodType: "fax",
      method: {
        id: "contact-method-3",
        value: "+1-555-0199",
        label: "contact.method.label.work",
        status: "contact.method.status.active",
      },
    },
    timestamp: "2024-03-02T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => contactReducer(created, event), {
    message: "Invalid contact method type: fax",
  });
});

test("contact.method.added rejects missing contact", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-contact-7",
    type: "contact.method.added",
    payload: {
      id: "contact-missing",
      methodType: "phones",
      method: {
        id: "contact-method-4",
        value: "+1-555-0100",
        label: "contact.method.label.work",
        status: "contact.method.status.active",
      },
    },
    timestamp: "2024-03-02T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => contactReducer(doc, event), {
    message: "Contact not found: contact-missing",
  });
});

test("contact.method.updated rejects missing contact", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-contact-8",
    type: "contact.method.updated",
    payload: {
      id: "contact-missing",
      methodType: "emails",
      index: 0,
      method: {
        id: "contact-method-1",
        value: "test@example.com",
        label: "contact.method.label.work",
        status: "contact.method.status.active",
      },
    },
    timestamp: "2024-03-03T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => contactReducer(doc, event), {
    message: "Contact not found: contact-missing",
  });
});

test("contact.updated updates contact fields", () => {
  const doc = initAutomergeDoc();
  const created = contactReducer(doc, baseContactEvent());
  const event: Event = {
    id: "evt-contact-9",
    type: "contact.updated",
    payload: {
      id: "contact-1",
      firstName: "Jordan",
      lastName: "Updated",
      title: "Manager",
      type: "contact.type.external",
    },
    timestamp: "2024-03-04T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = contactReducer(created, event);
  const contact = next.contacts["contact-1"];

  assert.ok(contact);
  assert.equal(contact.firstName, "Jordan");
  assert.equal(contact.lastName, "Updated");
  assert.equal(contact.name, "Jordan Updated");
  assert.equal(contact.title, "Manager");
  assert.equal(contact.type, "contact.type.external");
  assert.equal(contact.updatedAt, event.timestamp);
});

test("contact.updated rejects missing contact", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-contact-10",
    type: "contact.updated",
    payload: {
      id: "contact-missing",
      firstName: "Test",
    },
    timestamp: "2024-03-04T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => contactReducer(doc, event), {
    message: "Contact not found: contact-missing",
  });
});

test("contact.updated with legacy name splits into firstName/lastName", () => {
  const doc = initAutomergeDoc();
  const created = contactReducer(doc, baseContactEvent());
  const event: Event = {
    id: "evt-contact-11",
    type: "contact.updated",
    payload: {
      id: "contact-1",
      name: "Alex Johnson",
    },
    timestamp: "2024-03-04T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = contactReducer(created, event);
  const contact = next.contacts["contact-1"];

  assert.ok(contact);
  assert.equal(contact.name, "Alex Johnson");
  assert.equal(contact.firstName, "Alex");
  assert.equal(contact.lastName, "Johnson");
});

test("contact.updated with methods replaces contact methods", () => {
  const doc = initAutomergeDoc();
  const created = contactReducer(doc, baseContactEvent());
  const event: Event = {
    id: "evt-contact-12",
    type: "contact.updated",
    payload: {
      id: "contact-1",
      methods: {
        emails: [
          {
            id: "contact-method-new",
            value: "new@example.com",
            label: "contact.method.label.personal",
            status: "contact.method.status.active",
          },
        ],
        phones: [
          {
            id: "contact-method-phone",
            value: "+1-555-1234",
            label: "contact.method.label.mobile",
            status: "contact.method.status.active",
          },
        ],
      },
    },
    timestamp: "2024-03-04T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = contactReducer(created, event);
  const contact = next.contacts["contact-1"];

  assert.ok(contact);
  assert.equal(contact.methods.emails.length, 1);
  assert.equal(contact.methods.emails[0]?.value, "new@example.com");
  assert.equal(contact.methods.phones.length, 1);
  assert.equal(contact.methods.phones[0]?.value, "+1-555-1234");
});

test("contact.deleted removes a contact", () => {
  const doc = initAutomergeDoc();
  const created = contactReducer(doc, baseContactEvent());
  const event: Event = {
    id: "evt-contact-13",
    type: "contact.deleted",
    payload: {
      id: "contact-1",
    },
    timestamp: "2024-03-05T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = contactReducer(created, event);

  assert.equal(next.contacts["contact-1"], undefined);
});

test("contact.deleted rejects missing contact", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-contact-14",
    type: "contact.deleted",
    payload: {
      id: "contact-missing",
    },
    timestamp: "2024-03-05T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => contactReducer(doc, event), {
    message: "Contact not found: contact-missing",
  });
});

test("contactReducer rejects unhandled event types", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-contact-15",
    type: "contact.unknown",
    payload: {},
    timestamp: "2024-03-05T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => contactReducer(doc, event), {
    message: "contact.reducer does not handle event type: contact.unknown",
  });
});

test("contact.created with firstName/lastName (no legacy name)", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-contact-16",
    type: "contact.created",
    payload: {
      id: "contact-3",
      type: "contact.type.internal",
      firstName: "Jane",
      lastName: "Doe",
      methods: {
        emails: [],
        phones: [],
      },
    },
    timestamp: "2024-03-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = contactReducer(doc, event);
  const contact = next.contacts["contact-3"];

  assert.ok(contact);
  assert.equal(contact.firstName, "Jane");
  assert.equal(contact.lastName, "Doe");
  assert.equal(contact.name, "Jane Doe");
});
