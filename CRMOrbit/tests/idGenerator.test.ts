import assert from "node:assert/strict";

import { nextId } from "@domains/shared/idGenerator";

test("nextId generates an ID with the given prefix", () => {
  const id = nextId("org");
  assert.ok(id.startsWith("org-"));
});

test("nextId generates a valid UUID v4 format", () => {
  const id = nextId("account");
  const uuid = id.replace("account-", "");

  // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  assert.ok(uuidRegex.test(uuid), `UUID should match v4 format: ${uuid}`);
});

test("nextId generates unique IDs on successive calls", () => {
  const ids = new Set<string>();
  const iterations = 100;

  for (let i = 0; i < iterations; i++) {
    ids.add(nextId("test"));
  }

  assert.equal(ids.size, iterations, "All generated IDs should be unique");
});

test("nextId works with various prefix strings", () => {
  const prefixes = [
    "org",
    "account",
    "contact",
    "event",
    "interaction",
    "note",
    "device",
    "rel",
  ];

  for (const prefix of prefixes) {
    const id = nextId(prefix);
    assert.ok(id.startsWith(`${prefix}-`), `ID should start with ${prefix}-`);
  }
});

test("nextId handles empty prefix", () => {
  const id = nextId("");
  assert.ok(id.startsWith("-"), "ID with empty prefix should start with -");
  // Should still have a valid UUID after the dash
  const uuid = id.slice(1);
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  assert.ok(uuidRegex.test(uuid));
});

test("nextId handles prefix with special characters", () => {
  const id = nextId("my-prefix");
  assert.ok(id.startsWith("my-prefix-"));
});
