import assert from "node:assert/strict";

import type { Contact } from "@domains/contact";
import {
  getContactDisplayName,
  splitLegacyName,
  parsePhoneNumber,
  formatPhoneNumber,
  getPrimaryEmail,
  getPrimaryPhone,
  buildContactFromPayload,
} from "@domains/contact.utils";

const createContact = (overrides: Partial<Contact> = {}): Contact => ({
  id: "contact-1",
  firstName: "",
  lastName: "",
  type: "contact.type.internal",
  methods: { emails: [], phones: [] },
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

// getContactDisplayName tests

test("getContactDisplayName returns firstName + lastName when both exist", () => {
  const contact = createContact({ firstName: "John", lastName: "Doe" });
  assert.equal(getContactDisplayName(contact), "John Doe");
});

test("getContactDisplayName returns firstName only when lastName is empty", () => {
  const contact = createContact({ firstName: "John", lastName: "" });
  assert.equal(getContactDisplayName(contact), "John");
});

test("getContactDisplayName returns lastName only when firstName is empty", () => {
  const contact = createContact({ firstName: "", lastName: "Doe" });
  assert.equal(getContactDisplayName(contact), "Doe");
});

test("getContactDisplayName falls back to legacy name field", () => {
  const contact = createContact({
    firstName: "",
    lastName: "",
    name: "Legacy Name",
  });
  assert.equal(getContactDisplayName(contact), "Legacy Name");
});

test("getContactDisplayName returns Unnamed Contact when no name data", () => {
  const contact = createContact({ firstName: "", lastName: "" });
  assert.equal(getContactDisplayName(contact), "Unnamed Contact");
});

// splitLegacyName tests

test("splitLegacyName splits name at first space", () => {
  const result = splitLegacyName("John Doe");
  assert.deepEqual(result, { firstName: "John", lastName: "Doe" });
});

test("splitLegacyName handles multiple spaces in last name", () => {
  const result = splitLegacyName("Mary Jane Watson");
  assert.deepEqual(result, { firstName: "Mary", lastName: "Jane Watson" });
});

test("splitLegacyName handles single name as lastName", () => {
  const result = splitLegacyName("Madonna");
  assert.deepEqual(result, { firstName: "", lastName: "Madonna" });
});

test("splitLegacyName trims leading whitespace and splits at first space", () => {
  const result = splitLegacyName("  John   Doe  ");
  // Trims the full string first, then splits at first space
  // "John   Doe  " -> firstName: "John", lastName: "  Doe" (content after first space)
  assert.deepEqual(result, { firstName: "John", lastName: "  Doe" });
});

test("splitLegacyName handles empty string", () => {
  const result = splitLegacyName("");
  assert.deepEqual(result, { firstName: "", lastName: "" });
});

// parsePhoneNumber tests

test("parsePhoneNumber parses number without extension", () => {
  const result = parsePhoneNumber("555-123-4567");
  assert.deepEqual(result, { base: "555-123-4567", hasExtensionMarker: false });
});

test("parsePhoneNumber parses number with ext.", () => {
  const result = parsePhoneNumber("555-123-4567 ext. 123");
  assert.deepEqual(result, {
    base: "555-123-4567",
    extension: "123",
    hasExtensionMarker: true,
  });
});

test("parsePhoneNumber parses number with extension", () => {
  const result = parsePhoneNumber("555-123-4567 extension 456");
  assert.deepEqual(result, {
    base: "555-123-4567",
    extension: "456",
    hasExtensionMarker: true,
  });
});

test("parsePhoneNumber parses number with x", () => {
  const result = parsePhoneNumber("555-123-4567 x789");
  assert.deepEqual(result, {
    base: "555-123-4567",
    extension: "789",
    hasExtensionMarker: true,
  });
});

test("parsePhoneNumber parses number with #", () => {
  const result = parsePhoneNumber("555-123-4567 #101");
  assert.deepEqual(result, {
    base: "555-123-4567",
    extension: "101",
    hasExtensionMarker: true,
  });
});

test("parsePhoneNumber handles extension marker without number", () => {
  const result = parsePhoneNumber("555-123-4567 ext");
  assert.deepEqual(result, {
    base: "555-123-4567",
    extension: undefined,
    hasExtensionMarker: true,
  });
});

test("parsePhoneNumber handles empty string", () => {
  const result = parsePhoneNumber("");
  assert.deepEqual(result, { base: "", hasExtensionMarker: false });
});

test("parsePhoneNumber handles whitespace only", () => {
  const result = parsePhoneNumber("   ");
  assert.deepEqual(result, { base: "", hasExtensionMarker: false });
});

// formatPhoneNumber tests

test("formatPhoneNumber formats 10-digit number", () => {
  const result = formatPhoneNumber("5551234567");
  assert.equal(result, "555-123-4567");
});

test("formatPhoneNumber formats 11-digit number starting with 1", () => {
  const result = formatPhoneNumber("15551234567");
  assert.equal(result, "555-123-4567");
});

test("formatPhoneNumber preserves extension from value", () => {
  const result = formatPhoneNumber("5551234567 ext 123");
  assert.equal(result, "555-123-4567 x123");
});

test("formatPhoneNumber uses separate extension parameter", () => {
  const result = formatPhoneNumber("5551234567", "456");
  assert.equal(result, "555-123-4567 x456");
});

test("formatPhoneNumber leaves non-10-digit numbers unchanged", () => {
  const result = formatPhoneNumber("123456");
  assert.equal(result, "123456");
});

test("formatPhoneNumber handles extension marker only (no digits)", () => {
  const result = formatPhoneNumber("5551234567 x");
  assert.equal(result, "555-123-4567 x");
});

test("formatPhoneNumber handles empty base with extension marker", () => {
  const result = formatPhoneNumber("ext 123");
  assert.equal(result, "ext 123");
});

// getPrimaryEmail tests

test("getPrimaryEmail returns undefined when no emails", () => {
  const contact = createContact({ methods: { emails: [], phones: [] } });
  assert.equal(getPrimaryEmail(contact), undefined);
});

test("getPrimaryEmail returns first active email", () => {
  const contact = createContact({
    methods: {
      emails: [
        {
          id: "e1",
          value: "inactive@example.com",
          label: "contact.method.label.work",
          status: "contact.method.status.inactive",
        },
        {
          id: "e2",
          value: "active@example.com",
          label: "contact.method.label.work",
          status: "contact.method.status.active",
        },
      ],
      phones: [],
    },
  });
  assert.equal(getPrimaryEmail(contact), "active@example.com");
});

test("getPrimaryEmail returns first email when none are active", () => {
  const contact = createContact({
    methods: {
      emails: [
        {
          id: "e1",
          value: "first@example.com",
          label: "contact.method.label.work",
          status: "contact.method.status.inactive",
        },
        {
          id: "e2",
          value: "second@example.com",
          label: "contact.method.label.work",
          status: "contact.method.status.inactive",
        },
      ],
      phones: [],
    },
  });
  assert.equal(getPrimaryEmail(contact), "first@example.com");
});

// getPrimaryPhone tests

test("getPrimaryPhone returns undefined when no phones", () => {
  const contact = createContact({ methods: { emails: [], phones: [] } });
  assert.equal(getPrimaryPhone(contact), undefined);
});

test("getPrimaryPhone returns first active phone", () => {
  const contact = createContact({
    methods: {
      emails: [],
      phones: [
        {
          id: "p1",
          value: "555-000-0000",
          label: "contact.method.label.work",
          status: "contact.method.status.inactive",
        },
        {
          id: "p2",
          value: "555-111-1111",
          label: "contact.method.label.mobile",
          status: "contact.method.status.active",
        },
      ],
    },
  });
  assert.equal(getPrimaryPhone(contact), "555-111-1111");
});

test("getPrimaryPhone returns first phone when none are active", () => {
  const contact = createContact({
    methods: {
      emails: [],
      phones: [
        {
          id: "p1",
          value: "555-222-2222",
          label: "contact.method.label.work",
          status: "contact.method.status.inactive",
        },
      ],
    },
  });
  assert.equal(getPrimaryPhone(contact), "555-222-2222");
});

// buildContactFromPayload tests

test("buildContactFromPayload builds new contact from payload", () => {
  const result = buildContactFromPayload(
    "contact-new",
    {
      firstName: "Jane",
      lastName: "Smith",
      type: "contact.type.external",
      title: "Manager",
    },
    "2024-02-01T00:00:00.000Z",
  );

  assert.equal(result.id, "contact-new");
  assert.equal(result.firstName, "Jane");
  assert.equal(result.lastName, "Smith");
  assert.equal(result.type, "contact.type.external");
  assert.equal(result.title, "Manager");
  assert.equal(result.createdAt, "2024-02-01T00:00:00.000Z");
  assert.equal(result.updatedAt, "2024-02-01T00:00:00.000Z");
});

test("buildContactFromPayload merges with existing contact", () => {
  const existing = createContact({
    firstName: "John",
    lastName: "Doe",
    type: "contact.type.internal",
    createdAt: "2024-01-01T00:00:00.000Z",
  });

  const result = buildContactFromPayload(
    "contact-1",
    { firstName: "Johnny" },
    "2024-02-01T00:00:00.000Z",
    existing,
  );

  assert.equal(result.firstName, "Johnny");
  assert.equal(result.lastName, "Doe");
  assert.equal(result.type, "contact.type.internal");
  assert.equal(result.createdAt, "2024-01-01T00:00:00.000Z");
  assert.equal(result.updatedAt, "2024-02-01T00:00:00.000Z");
});

test("buildContactFromPayload uses defaults when no existing contact", () => {
  const result = buildContactFromPayload(
    "contact-new",
    {},
    "2024-02-01T00:00:00.000Z",
  );

  assert.equal(result.firstName, "");
  assert.equal(result.lastName, "");
  assert.equal(result.type, "contact.type.internal");
  assert.deepEqual(result.methods, { emails: [], phones: [] });
});

test("buildContactFromPayload handles methods in payload", () => {
  const methods = {
    emails: [
      {
        id: "e1",
        value: "test@example.com",
        label: "contact.method.label.work" as const,
        status: "contact.method.status.active" as const,
      },
    ],
    phones: [],
  };

  const result = buildContactFromPayload(
    "contact-new",
    { methods },
    "2024-02-01T00:00:00.000Z",
  );

  assert.deepEqual(result.methods, methods);
});

test("buildContactFromPayload preserves legacy name field", () => {
  const result = buildContactFromPayload(
    "contact-new",
    { name: "Legacy Name" },
    "2024-02-01T00:00:00.000Z",
  );

  assert.equal(result.name, "Legacy Name");
});

test("buildContactFromPayload validates contact type", () => {
  const result = buildContactFromPayload(
    "contact-new",
    { type: "invalid.type" },
    "2024-02-01T00:00:00.000Z",
  );

  assert.equal(result.type, "contact.type.internal");
});
