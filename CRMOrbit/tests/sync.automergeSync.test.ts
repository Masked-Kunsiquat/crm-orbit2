import assert from "node:assert/strict";

import Automerge from "automerge";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AutomergeDoc } from "@automerge/schema";
import { initAutomergeDoc } from "@automerge/init";
import {
  applyReceivedChanges,
  createSyncBundle,
  getChangesSinceLastSync,
  parseSyncBundle,
  saveSyncCheckpoint,
} from "@domains/sync/automergeSync";

const toPlain = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const assertDocsEqual = (left: unknown, right: unknown): void => {
  assert.deepEqual(toPlain(left), toPlain(right));
};

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

const createDocWithOrganization = (id: string, name: string) => {
  const timestamp = "2025-01-01T00:00:00.000Z";
  let doc = Automerge.from(initAutomergeDoc());
  doc = Automerge.change(doc, (draft) => {
    draft.organizations[id] = {
      id,
      name,
      status: "organization.status.active",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });
  return doc;
};

beforeEach(() => {
  storage.clear();
});

test("getChangesSinceLastSync returns full changes on first sync", async () => {
  const doc = createDocWithOrganization("org-1", "Acme");
  const emptyDoc = Automerge.init<AutomergeDoc>();

  const changes = await getChangesSinceLastSync(doc, "peer-1");
  const merged = applyReceivedChanges(emptyDoc, changes);

  assertDocsEqual(doc, merged);
});

test("getChangesSinceLastSync returns incremental changes after checkpoint", async () => {
  const peerId = "peer-2";
  const docV1 = createDocWithOrganization("org-1", "Acme");
  await saveSyncCheckpoint(docV1, peerId);

  let docV2 = docV1;
  docV2 = Automerge.change(docV2, (draft) => {
    draft.organizations["org-2"] = {
      id: "org-2",
      name: "Bravo",
      status: "organization.status.active",
      createdAt: "2025-01-02T00:00:00.000Z",
      updatedAt: "2025-01-02T00:00:00.000Z",
    };
  });

  const changes = await getChangesSinceLastSync(docV2, peerId);
  const merged = applyReceivedChanges(docV1, changes);

  assert.ok(changes.length > 0);
  assertDocsEqual(docV2, merged);
});

test("createSyncBundle and parseSyncBundle round-trip changes", async () => {
  const doc = createDocWithOrganization("org-3", "Orbit");
  const emptyDoc = Automerge.init<AutomergeDoc>();

  const bundle = await createSyncBundle(doc, "qr-peer");
  const changes = parseSyncBundle(bundle);
  const merged = applyReceivedChanges(emptyDoc, changes);

  assertDocsEqual(doc, merged);
});

test("applyReceivedChanges returns original doc for empty payload", () => {
  const doc = createDocWithOrganization("org-4", "Delta");

  const merged = applyReceivedChanges(doc, new Uint8Array());

  assert.equal(merged, doc);
});
