import type { Timestamp } from "@domains/shared/types";

export type DeviceInfo = {
  deviceId: string;
  deviceName: string;
  lastSeen: Timestamp;
  ipAddress?: string;
  port?: number;
};

export type SyncMethod = "local-network" | "webrtc" | "qr-code" | "manual";

export type SyncStatus =
  | "idle"
  | "discovering"
  | "connecting"
  | "syncing"
  | "completed"
  | "error";

export type SyncSession = {
  id: string;
  peerId: string;
  method: SyncMethod;
  status: SyncStatus;
  startedAt: Timestamp;
  completedAt?: Timestamp;
  changesSent: number;
  changesReceived: number;
  error?: string;
};

export type SyncMessage = {
  type: "sync-request" | "sync-response" | "ping" | "pong";
  deviceId: string;
  timestamp: Timestamp;
  changes?: Uint8Array; // Automerge binary changes
  fromVersion?: string; // Last known sync point
  images?: ImageSyncManifest;
};

export type ImageSyncManifest = {
  added: string[]; // URIs of new images
  deleted: string[]; // URIs of deleted images
  checksums: Record<string, string>; // URI -> checksum
};
