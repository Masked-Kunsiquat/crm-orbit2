import { create } from "zustand";

import type { Timestamp } from "@domains/shared/types";
import type { DeviceInfo, SyncMethod, SyncSession, SyncStatus } from "./types";

interface SyncState {
  // Device management
  localDeviceId: string;
  discoveredPeers: Record<string, DeviceInfo>;

  // Sync sessions
  activeSessions: Record<string, SyncSession>;
  lastSyncTimestamp: Timestamp | null;

  // Status
  status: SyncStatus;
  currentMethod: SyncMethod | null;

  // Actions
  setLocalDeviceId: (deviceId: string) => void;
  setStatus: (status: SyncStatus) => void;
  addPeer: (peer: DeviceInfo) => void;
  removePeer: (deviceId: string) => void;
  startSession: (session: SyncSession) => void;
  updateSession: (sessionId: string, updates: Partial<SyncSession>) => void;
  completeSession: (sessionId: string) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  localDeviceId: "", // Initialize via useDeviceId hook.
  discoveredPeers: {},
  activeSessions: {},
  lastSyncTimestamp: null,
  status: "idle",
  currentMethod: null,

  setLocalDeviceId: (deviceId) =>
    set({
      localDeviceId: deviceId.trim() || deviceId,
    }),

  setStatus: (status) => set({ status }),

  addPeer: (peer) =>
    set((state) => ({
      discoveredPeers: { ...state.discoveredPeers, [peer.deviceId]: peer },
    })),

  removePeer: (deviceId) =>
    set((state) => {
      const nextPeers = { ...state.discoveredPeers };
      delete nextPeers[deviceId];
      return { discoveredPeers: nextPeers };
    }),

  startSession: (session) =>
    set((state) => ({
      activeSessions: { ...state.activeSessions, [session.id]: session },
      status: "connecting",
      currentMethod: session.method,
    })),

  updateSession: (sessionId, updates) =>
    set((state) => {
      const session = state.activeSessions[sessionId];
      if (!session) return state;
      return {
        activeSessions: {
          ...state.activeSessions,
          [sessionId]: { ...session, ...updates },
        },
      };
    }),

  completeSession: (sessionId) =>
    set((state) => {
      const session = state.activeSessions[sessionId];
      if (!session) return state;
      return {
        lastSyncTimestamp: session.completedAt || new Date().toISOString(),
        status: "completed",
        currentMethod: null,
      };
    }),
}));
