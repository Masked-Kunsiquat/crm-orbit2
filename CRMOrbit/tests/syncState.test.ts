import assert from "node:assert/strict";

import type { DeviceInfo, SyncSession } from "@domains/sync/types";
import { useSyncStore } from "@domains/sync/syncState";

const resetSyncStore = () => {
  useSyncStore.setState({
    localDeviceId: null,
    discoveredPeers: {},
    activeSessions: {},
    lastSyncTimestamp: null,
    status: "idle",
    currentMethod: null,
  });
};

beforeEach(() => {
  resetSyncStore();
});

test("setLocalDeviceId trims the value", () => {
  useSyncStore.getState().setLocalDeviceId(" device-1 ");

  assert.equal(useSyncStore.getState().localDeviceId, "device-1");
});

test("setLocalDeviceId clears whitespace-only values", () => {
  useSyncStore.getState().setLocalDeviceId("   ");

  assert.equal(useSyncStore.getState().localDeviceId, null);
});

test("addPeer and removePeer update discoveredPeers", () => {
  const peer: DeviceInfo = {
    deviceId: "device-2",
    deviceName: "Device Two",
    lastSeen: "2025-02-01T10:00:00.000Z",
  };

  useSyncStore.getState().addPeer(peer);
  assert.equal(Object.keys(useSyncStore.getState().discoveredPeers).length, 1);

  useSyncStore.getState().removePeer(peer.deviceId);
  assert.equal(Object.keys(useSyncStore.getState().discoveredPeers).length, 0);
});

test("startSession sets status and current method", () => {
  const session: SyncSession = {
    id: "session-1",
    peerId: "device-3",
    method: "local-network",
    status: "connecting",
    startedAt: "2025-03-01T12:00:00.000Z",
    changesSent: 0,
    changesReceived: 0,
  };

  useSyncStore.getState().startSession(session);

  const state = useSyncStore.getState();
  assert.equal(state.activeSessions[session.id]?.peerId, session.peerId);
  assert.equal(state.status, "connecting");
  assert.equal(state.currentMethod, "local-network");
});

test("updateSession merges updates when session exists", () => {
  const session: SyncSession = {
    id: "session-2",
    peerId: "device-4",
    method: "webrtc",
    status: "connecting",
    startedAt: "2025-03-02T09:00:00.000Z",
    changesSent: 0,
    changesReceived: 0,
  };

  useSyncStore.getState().startSession(session);
  useSyncStore.getState().updateSession(session.id, {
    status: "syncing",
    changesSent: 3,
  });

  const updated = useSyncStore.getState().activeSessions[session.id];
  assert.equal(updated?.status, "syncing");
  assert.equal(updated?.changesSent, 3);
  assert.equal(updated?.peerId, session.peerId);
});

test("completeSession records timestamp and clears current method", () => {
  const session: SyncSession = {
    id: "session-3",
    peerId: "device-5",
    method: "qr-code",
    status: "syncing",
    startedAt: "2025-03-03T09:00:00.000Z",
    completedAt: "2025-03-03T09:05:00.000Z",
    changesSent: 1,
    changesReceived: 2,
  };

  useSyncStore.getState().startSession(session);
  useSyncStore.getState().completeSession(session.id);

  const state = useSyncStore.getState();
  assert.equal(state.lastSyncTimestamp, session.completedAt);
  assert.equal(state.status, "completed");
  assert.equal(state.currentMethod, null);
  assert.equal(state.activeSessions[session.id], undefined);
});
