import assert from "node:assert/strict";

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  acquireExternalCalendarSyncLock,
  getExternalBackgroundSyncEnabled,
  getExternalBackgroundSyncStatus,
  releaseExternalCalendarSyncLock,
  setExternalBackgroundSyncEnabled,
  setExternalBackgroundSyncStatus,
} from "@views/utils/externalCalendarBackground";

type AsyncStorageMock = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  __storage: Map<string, string>;
};

jest.mock("@react-native-async-storage/async-storage", () => {
  const storage = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key: string) =>
        Promise.resolve(storage.get(key) ?? null),
      ),
      setItem: jest.fn((key: string, value: string) => {
        storage.set(key, value);
        return Promise.resolve();
      }),
      removeItem: jest.fn((key: string) => {
        storage.delete(key);
        return Promise.resolve();
      }),
      __storage: storage,
    },
  };
});

const storage = (AsyncStorage as unknown as AsyncStorageMock).__storage;

beforeEach(() => {
  storage.clear();
  jest.restoreAllMocks();
});

test("background sync enabled flag toggles and persists", async () => {
  assert.equal(await getExternalBackgroundSyncEnabled(), false);

  await setExternalBackgroundSyncEnabled(true);
  assert.equal(await getExternalBackgroundSyncEnabled(), true);

  await setExternalBackgroundSyncEnabled(false);
  assert.equal(await getExternalBackgroundSyncEnabled(), false);
});

test("background sync status stores last run details", async () => {
  const timestamp = "2026-02-01T10:30:00.000Z";
  await setExternalBackgroundSyncStatus({
    lastRunAt: timestamp,
    lastOutcome: "success",
  });

  const status = await getExternalBackgroundSyncStatus();
  assert.equal(status.lastRunAt, timestamp);
  assert.equal(status.lastOutcome, "success");
});

test("sync lock blocks overlapping runs until released", async () => {
  const nowSpy = jest.spyOn(Date, "now").mockReturnValue(1000);

  const first = await acquireExternalCalendarSyncLock();
  const second = await acquireExternalCalendarSyncLock();
  assert.equal(first, true);
  assert.equal(second, false);

  await releaseExternalCalendarSyncLock();
  nowSpy.mockReturnValue(2000);

  const third = await acquireExternalCalendarSyncLock();
  assert.equal(third, true);
});
