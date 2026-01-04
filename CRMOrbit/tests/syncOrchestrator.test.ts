import assert from "node:assert/strict";

import { initAutomergeDoc } from "@automerge/init";
import type { AutomergeDoc } from "@automerge/schema";
import type { SyncQRCodeChunk } from "@domains/sync/qrCodeSync";

const mockLocalNetworkSync = {
  startAdvertising: jest.fn(),
  startScanning: jest.fn(),
  stopAdvertising: jest.fn(),
  stopScanning: jest.fn(),
  syncWithPeer: jest.fn(),
  setSyncHandler: jest.fn(),
};

const mockWebRTCConnection = {
  createOffer: jest.fn(),
  acceptAnswer: jest.fn(),
  sendData: jest.fn(),
  close: jest.fn(),
};

const mockCreateWebRTCConnection = jest.fn(() => mockWebRTCConnection);

const mockApplyReceivedChanges = jest.fn();
const mockGetChangesSinceLastSync = jest.fn();
const mockSaveSyncCheckpoint = jest.fn();

const mockGenerateSyncQRCode = jest.fn();
const mockParseSyncQRCode = jest.fn();
const mockAssembleSyncChunks = jest.fn();

jest.mock("@domains/sync/localNetworkSync", () => ({
  __esModule: true,
  localNetworkSync: mockLocalNetworkSync,
}));

jest.mock("@domains/sync/webrtcSync", () => ({
  __esModule: true,
  createWebRTCConnection: () => mockCreateWebRTCConnection(),
}));

jest.mock("@domains/sync/automergeSync", () => ({
  __esModule: true,
  applyReceivedChanges: (...args: unknown[]) =>
    mockApplyReceivedChanges(...args),
  getChangesSinceLastSync: (...args: unknown[]) =>
    mockGetChangesSinceLastSync(...args),
  saveSyncCheckpoint: (...args: unknown[]) => mockSaveSyncCheckpoint(...args),
}));

jest.mock("@domains/sync/qrCodeSync", () => ({
  __esModule: true,
  generateSyncQRCode: (...args: unknown[]) => mockGenerateSyncQRCode(...args),
  parseSyncQRCode: (...args: unknown[]) => mockParseSyncQRCode(...args),
  assembleSyncChunks: (...args: unknown[]) => mockAssembleSyncChunks(...args),
}));

const baseDoc = initAutomergeDoc();

const encodeJson = (message: Record<string, unknown>): Uint8Array => {
  const payload = JSON.stringify(message);
  const Encoder = globalThis.TextEncoder;
  if (Encoder) {
    return new Encoder().encode(payload);
  }
  const nodeBuffer = (
    globalThis as {
      Buffer?: { from: (input: string, encoding: string) => Uint8Array };
    }
  ).Buffer;
  if (nodeBuffer) {
    return Uint8Array.from(nodeBuffer.from(payload, "utf8"));
  }
  return Uint8Array.from(Array.from(payload).map((char) => char.charCodeAt(0)));
};

beforeEach(() => {
  mockLocalNetworkSync.startAdvertising.mockReset();
  mockLocalNetworkSync.startScanning.mockReset();
  mockLocalNetworkSync.stopAdvertising.mockReset();
  mockLocalNetworkSync.stopScanning.mockReset();
  mockLocalNetworkSync.syncWithPeer.mockReset();
  mockLocalNetworkSync.setSyncHandler.mockReset();

  mockCreateWebRTCConnection.mockClear();
  mockWebRTCConnection.createOffer.mockReset();
  mockWebRTCConnection.acceptAnswer.mockReset();
  mockWebRTCConnection.sendData.mockReset();
  mockWebRTCConnection.close.mockReset();

  mockApplyReceivedChanges.mockReset();
  mockGetChangesSinceLastSync.mockReset();
  mockSaveSyncCheckpoint.mockReset();

  mockGenerateSyncQRCode.mockReset();
  mockParseSyncQRCode.mockReset();
  mockAssembleSyncChunks.mockReset();
  jest.resetModules();
});

const loadOrchestrator = () => {
  let syncOrchestrator:
    | {
        initialize: (doc: AutomergeDoc, deviceId?: string) => void;
        startAutoDiscovery: () => Promise<void>;
        stopAutoDiscovery: () => void;
        syncWithPeer: (
          peer: {
            deviceId: string;
            deviceName: string;
            lastSeen: string;
            ipAddress?: string;
            port?: number;
          },
          options?: { getWebRTCAnswer?: (offer: string) => Promise<string> },
        ) => Promise<AutomergeDoc>;
        applyManualSyncQR: (
          qrData: string,
          peerId?: string,
        ) => Promise<
          | {
              status: "pending";
              bundleId: string;
              received: number;
              total: number;
            }
          | { status: "applied"; doc: AutomergeDoc }
        >;
      }
    | undefined;

  jest.isolateModules(() => {
    ({ syncOrchestrator } = jest.requireActual(
      "@domains/sync/syncOrchestrator",
    ));
  });

  if (!syncOrchestrator) {
    throw new Error("Failed to load sync orchestrator.");
  }

  syncOrchestrator.initialize({ ...baseDoc }, "device-1");
  return syncOrchestrator;
};

test("startAutoDiscovery triggers local network advertising + scanning", async () => {
  const syncOrchestrator = await loadOrchestrator();
  await syncOrchestrator.startAutoDiscovery();

  assert.equal(mockLocalNetworkSync.startAdvertising.mock.calls.length, 1);
  assert.equal(mockLocalNetworkSync.startScanning.mock.calls.length, 1);
});

test("stopAutoDiscovery stops local network advertising + scanning", async () => {
  const syncOrchestrator = await loadOrchestrator();
  syncOrchestrator.stopAutoDiscovery();

  assert.equal(mockLocalNetworkSync.stopAdvertising.mock.calls.length, 1);
  assert.equal(mockLocalNetworkSync.stopScanning.mock.calls.length, 1);
});

test("syncWithPeer uses local network when peer has IP", async () => {
  const syncOrchestrator = await loadOrchestrator();
  const peer = {
    deviceId: "peer-1",
    deviceName: "Peer",
    lastSeen: "2025-04-01T00:00:00.000Z",
    ipAddress: "192.168.1.10",
    port: 8765,
  };

  mockGetChangesSinceLastSync.mockResolvedValue(new Uint8Array([1]));
  mockLocalNetworkSync.syncWithPeer.mockResolvedValue(
    encodeJson({
      type: "sync-response",
      deviceId: peer.deviceId,
      timestamp: "2025-04-01T00:00:00.000Z",
    }),
  );
  const updatedDoc: AutomergeDoc = { ...baseDoc };
  mockApplyReceivedChanges.mockReturnValue(updatedDoc);

  const result = await syncOrchestrator.syncWithPeer(peer);

  assert.equal(result, updatedDoc);
  assert.equal(mockLocalNetworkSync.syncWithPeer.mock.calls.length, 1);
  assert.equal(mockSaveSyncCheckpoint.mock.calls.length, 1);
});

test("syncWithPeer requires WebRTC answer when no IP", async () => {
  const syncOrchestrator = await loadOrchestrator();
  const peer = {
    deviceId: "peer-2",
    deviceName: "Peer",
    lastSeen: "2025-04-01T00:00:00.000Z",
  };

  await assert.rejects(() => syncOrchestrator.syncWithPeer(peer));
});

test("applyManualSyncQR handles chunked payloads", async () => {
  const syncOrchestrator = await loadOrchestrator();
  const chunk: SyncQRCodeChunk = {
    bundleId: "bundle-1",
    index: 1,
    total: 2,
    data: "abc",
  };

  mockParseSyncQRCode.mockReturnValue({ kind: "chunk", chunk });

  const pending = await syncOrchestrator.applyManualSyncQR("data-1");
  assert.equal(pending.status, "pending");

  const chunk2: SyncQRCodeChunk = {
    bundleId: "bundle-1",
    index: 2,
    total: 2,
    data: "def",
  };

  mockParseSyncQRCode.mockReturnValue({ kind: "chunk", chunk: chunk2 });
  mockAssembleSyncChunks.mockReturnValue(new Uint8Array([9]));
  const updatedDoc: AutomergeDoc = { ...baseDoc };
  mockApplyReceivedChanges.mockReturnValue(updatedDoc);

  const applied = await syncOrchestrator.applyManualSyncQR("data-2");
  assert.equal(applied.status, "applied");
  assert.equal(applied.doc, updatedDoc);
  assert.equal(mockAssembleSyncChunks.mock.calls.length, 1);
  assert.equal(mockSaveSyncCheckpoint.mock.calls.length, 1);
});

test("syncViaWebRTC sends sync-request after offer/answer", async () => {
  const syncOrchestrator = await loadOrchestrator();
  const peer = {
    deviceId: "peer-3",
    deviceName: "Peer",
    lastSeen: "2025-04-01T00:00:00.000Z",
  };

  mockWebRTCConnection.createOffer.mockImplementation(async (handler) => {
    await handler(
      encodeJson({
        type: "sync-response",
        deviceId: peer.deviceId,
        timestamp: "2025-04-01T00:00:00.000Z",
      }),
    );
    return "offer";
  });
  mockGetChangesSinceLastSync.mockResolvedValue(new Uint8Array([1, 2]));

  const result = await syncOrchestrator.syncWithPeer(peer, {
    getWebRTCAnswer: async () => "answer",
  });

  assert.ok(result);
  assert.equal(mockWebRTCConnection.acceptAnswer.mock.calls.length, 1);
  assert.equal(mockWebRTCConnection.sendData.mock.calls.length, 1);
});
