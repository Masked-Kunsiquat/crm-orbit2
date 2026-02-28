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

test("settings.calendar.updated updates calendar palette", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-settings-4",
    type: "settings.calendar.updated",
    payload: {
      palette: "meadow",
    },
    timestamp: "2024-03-04T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = settingsReducer(doc, event);

  assert.equal(next.settings.calendar.palette, "meadow");
  assert.equal(next.settings.appearance.palette, "meadow");
  assert.equal(next.settings.security.biometricAuth, "enabled");
});

test("settings.calendar.updated rejects invalid palette", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-settings-5",
    type: "settings.calendar.updated",
    payload: {
      palette: "neon",
    },
    timestamp: "2024-03-05T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => settingsReducer(doc, event), {
    message: "Invalid calendar palette: neon",
  });
});

test("settings.appearance.updated updates appearance settings", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-settings-6",
    type: "settings.appearance.updated",
    payload: {
      palette: "ember",
      mode: "dark",
    },
    timestamp: "2024-03-06T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = settingsReducer(doc, event);

  assert.equal(next.settings.appearance.palette, "ember");
  assert.equal(next.settings.appearance.mode, "dark");
  assert.equal(next.settings.calendar.palette, "ember");
});

test("settings.appearance.updated rejects invalid mode", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-settings-7",
    type: "settings.appearance.updated",
    payload: {
      mode: "dim",
    },
    timestamp: "2024-03-07T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => settingsReducer(doc, event), {
    message: "Invalid theme mode: dim",
  });
});

test("settings.security.updated rejects non-object payload", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-settings-8",
    type: "settings.security.updated",
    payload: "invalid",
    timestamp: "2024-03-08T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => settingsReducer(doc, event), {
    message: "settings.security.updated payload must be an object",
  });
});

test("settings.security.updated rejects invalid biometricAuth", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-settings-9",
    type: "settings.security.updated",
    payload: {
      biometricAuth: "invalid",
    },
    timestamp: "2024-03-09T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => settingsReducer(doc, event), {
    message: "Invalid biometricAuth setting: invalid",
  });
});

test("settings.security.updated rejects invalid authFrequency", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-settings-10",
    type: "settings.security.updated",
    payload: {
      authFrequency: "invalid",
    },
    timestamp: "2024-03-10T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => settingsReducer(doc, event), {
    message: "Invalid authFrequency setting: invalid",
  });
});

test("settings.calendar.updated rejects non-object payload", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-settings-11",
    type: "settings.calendar.updated",
    payload: null,
    timestamp: "2024-03-11T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => settingsReducer(doc, event), {
    message: "settings.calendar.updated payload must be an object",
  });
});

test("settings.calendar.updated preserves existing settings", () => {
  const doc = initAutomergeDoc();
  const event1: Event = {
    id: "evt-settings-12",
    type: "settings.security.updated",
    payload: {
      biometricAuth: "disabled",
    },
    timestamp: "2024-03-12T00:00:00.000Z",
    deviceId: "device-1",
  };
  const event2: Event = {
    id: "evt-settings-13",
    type: "settings.calendar.updated",
    payload: {
      palette: "meadow",
    },
    timestamp: "2024-03-13T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next1 = settingsReducer(doc, event1);
  const next2 = settingsReducer(next1, event2);

  assert.equal(next2.settings.security.biometricAuth, "disabled");
  assert.equal(next2.settings.calendar.palette, "meadow");
});

test("settings.appearance.updated rejects non-object payload", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-settings-14",
    type: "settings.appearance.updated",
    payload: 123,
    timestamp: "2024-03-14T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => settingsReducer(doc, event), {
    message: "settings.appearance.updated payload must be an object",
  });
});

test("settings.appearance.updated rejects invalid palette", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-settings-15",
    type: "settings.appearance.updated",
    payload: {
      palette: "invalid",
    },
    timestamp: "2024-03-15T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => settingsReducer(doc, event), {
    message: "Invalid app palette: invalid",
  });
});

test("settings.appearance.updated supports partial updates", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-settings-16",
    type: "settings.appearance.updated",
    payload: {
      mode: "dark",
    },
    timestamp: "2024-03-16T00:00:00.000Z",
    deviceId: "device-1",
  };

  const next = settingsReducer(doc, event);

  assert.equal(next.settings.appearance.mode, "dark");
  assert.equal(next.settings.appearance.palette, "orbit");
});

test("settingsReducer rejects unhandled event types", () => {
  const doc = initAutomergeDoc();
  const event: Event = {
    id: "evt-settings-17",
    type: "settings.unknown",
    payload: {},
    timestamp: "2024-03-17T00:00:00.000Z",
    deviceId: "device-1",
  };

  assert.throws(() => settingsReducer(doc, event), {
    message: "settings.reducer does not handle event type: settings.unknown",
  });
});
