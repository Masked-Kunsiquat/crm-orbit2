import { create } from "zustand";

import type { Timestamp } from "@domains/shared/types";
import type { DeviceInfo, SyncMethod, SyncSession, SyncStatus } from "./types";

interface SyncState {
  // Device management
  localDeviceId: string | null;
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
  startSession: (session: SyncSession, initialStatus?: SyncStatus) => void;
  updateSession: (sessionId: string, updates: Partial<SyncSession>) => void;
  completeSession: (sessionId: string) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  localDeviceId: null, // Initialize via useDeviceId hook.
  discoveredPeers: {},
  activeSessions: {},
  lastSyncTimestamp: null,
  status: "idle",
  currentMethod: null,

  setLocalDeviceId: (deviceId) => {
    const trimmed = deviceId.trim();
    set({
      localDeviceId: trimmed.length > 0 ? trimmed : null,
    });
  },

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

  startSession: (session, initialStatus = "connecting") =>
    set((state) => ({
      ...state,
      activeSessions: {
        ...state.activeSessions,
        [session.id]: { ...session, status: initialStatus },
      },
      status: initialStatus,
      currentMethod: session.method,
    })),

  updateSession: (sessionId, updates) =>
    set((state) => {
      const session = state.activeSessions[sessionId];
      if (!session) return state;
      return {
        ...state,
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
      const nextSessions = { ...state.activeSessions };
      delete nextSessions[sessionId];
      return {
        ...state,
        activeSessions: nextSessions,
        lastSyncTimestamp: session.completedAt || new Date().toISOString(),
        status: "completed",
        currentMethod: null,
      };
    }),
}));
