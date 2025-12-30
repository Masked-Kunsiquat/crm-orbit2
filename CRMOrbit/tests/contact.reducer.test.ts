import assert from "node:assert/strict";

import { initAutomergeDoc } from "../crm-core/automerge/init";
import { contactReducer } from "../crm-core/reducers/contact.reducer";
import type { Event } from "../crm-core/events/event";

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
