import assert from "node:assert/strict";

import { initAutomergeDoc } from "@automerge/init";
import { settingsReducer } from "@reducers/settings.reducer";
import type { Event } from "@events/event";

test("settings.security.updated updates security settings", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-settings-1",
    type: "settings.security.updated",
    payload: {
      biometricAuth: "disabled",
      blurTimeout: "60",
      authFrequency: "session",
    },
    timestamp: "2024-03-01T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = settingsReducer(doc, event);

  assert.equal(next.settings.security.biometricAuth, "disabled");
  assert.equal(next.settings.security.blurTimeout, "60");
  assert.equal(next.settings.security.authFrequency, "session");
});

test("settings.security.updated supports partial updates", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-settings-2",
    type: "settings.security.updated",
    payload: {
      blurTimeout: "15",
    },
    timestamp: "2024-03-02T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = settingsReducer(doc, event);

  assert.equal(next.settings.security.blurTimeout, "15");
  assert.equal(next.settings.security.biometricAuth, "enabled");
  assert.equal(next.settings.security.authFrequency, "each");
});

test("settings.security.updated rejects invalid values", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-settings-3",
    type: "settings.security.updated",
    payload: {
      blurTimeout: "999",
    },
    timestamp: "2024-03-03T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => settingsReducer(doc, event), {
    message: "Invalid blurTimeout setting: 999",
  });
});
