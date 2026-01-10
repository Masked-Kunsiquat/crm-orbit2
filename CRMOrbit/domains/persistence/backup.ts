import type { Event } from "@events/event";
import { EVENT_TYPES } from "@events/eventTypes";
import { sortEvents } from "@events/ordering";
import type { DeviceId, Timestamp } from "@domains/shared/types";
import type { EventLogRecord, PersistenceDb, SnapshotRecord } from "./store";
import {
  appendEvents,
  clearPersistence,
  loadLatestSnapshot,
  persistSnapshotAndEvents,
} from "./store";
import { eventLog } from "./schema";
import { decryptPayload, encryptPayload } from "@utils/encryption";

const BACKUP_VERSION = 1;
const EVENT_TYPE_SET = new Set<string>(EVENT_TYPES);

export type BackupPayload = {
  version: number;
  createdAt: Timestamp;
  deviceId: DeviceId;
  appVersion?: string;
  events: Event[];
  snapshot?: SnapshotRecord;
};

export type BackupImportMode = "merge" | "replace";

export type BackupImportResult = {
  mode: BackupImportMode;
  eventsImported: number;
  eventsSkipped: number;
  snapshotApplied: boolean;
};

export type BackupDecryptionErrorKind = "invalidGhash" | "unknown";

export class BackupDecryptionError extends Error {
  readonly kind: BackupDecryptionErrorKind;

  constructor(
    kind: BackupDecryptionErrorKind,
    message = "Failed to decrypt backup.",
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "BackupDecryptionError";
    this.kind = kind;
  }
}

type BackupPayloadInput = {
  deviceId: DeviceId;
  appVersion?: string;
  createdAt?: Timestamp;
};

const ensureRecord = (
  value: unknown,
  label: string,
): Record<string, unknown> => {
  if (!value || typeof value !== "object") {
    throw new Error(`Invalid ${label}.`);
  }
  return value as Record<string, unknown>;
};

const ensureString = (value: unknown, label: string): string => {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Invalid ${label}.`);
  }
  return value;
};

const parseEvent = (value: unknown): Event => {
  const record = ensureRecord(value, "event");
  const id = ensureString(record.id, "event.id");
  const typeValue = ensureString(record.type, "event.type");
  if (!EVENT_TYPE_SET.has(typeValue)) {
    throw new Error(`Invalid event.type: ${typeValue}.`);
  }
  const timestamp = ensureString(record.timestamp, "event.timestamp");
  const deviceId = ensureString(record.deviceId, "event.deviceId");
  const entityId = record.entityId;
  if (
    entityId !== undefined &&
    entityId !== null &&
    typeof entityId !== "string"
  ) {
    throw new Error("Invalid event.entityId.");
  }
  if (!("payload" in record)) {
    throw new Error("Invalid event.payload.");
  }
  return {
    id,
    type: typeValue as Event["type"],
    entityId: entityId ?? undefined,
    payload: record.payload,
    timestamp,
    deviceId,
  };
};

const parseSnapshot = (value: unknown): SnapshotRecord => {
  const record = ensureRecord(value, "snapshot");
  return {
    id: ensureString(record.id, "snapshot.id"),
    doc: ensureString(record.doc, "snapshot.doc"),
    timestamp: ensureString(record.timestamp, "snapshot.timestamp"),
  };
};

export const createBackupPayload = async (
  db: PersistenceDb,
  input: BackupPayloadInput,
): Promise<BackupPayload> => {
  const snapshot = await loadLatestSnapshot(db);
  const eventRecords = await db.select().from<EventLogRecord>(eventLog).all();
  const parsedEvents = eventRecords.map((record) => ({
    id: record.id,
    type: record.type as Event["type"],
    entityId: record.entityId ?? undefined,
    payload: (() => {
      try {
        return JSON.parse(record.payload);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const details = `id=${record.id} type=${record.type} entityId=${record.entityId ?? "none"}`;
        throw new Error(
          `Failed to parse event payload (${details}): ${message}`,
          {
            cause: error,
          },
        );
      }
    })(),
    timestamp: record.timestamp,
    deviceId: record.deviceId,
  }));

  return {
    version: BACKUP_VERSION,
    createdAt: input.createdAt ?? new Date().toISOString(),
    deviceId: input.deviceId,
    appVersion: input.appVersion,
    events: sortEvents(parsedEvents),
    snapshot: snapshot ?? undefined,
  };
};

export const parseBackupPayload = (value: unknown): BackupPayload => {
  const record = ensureRecord(value, "backup payload");
  const version = record.version;
  if (version !== BACKUP_VERSION) {
    throw new Error("Unsupported backup version.");
  }

  const createdAt = ensureString(record.createdAt, "backup.createdAt");
  const deviceId = ensureString(record.deviceId, "backup.deviceId");
  const appVersion =
    record.appVersion === undefined || record.appVersion === null
      ? undefined
      : ensureString(record.appVersion, "backup.appVersion");
  if (!Array.isArray(record.events)) {
    throw new Error("Invalid backup.events.");
  }

  const seenIds = new Set<string>();
  const events = record.events.map((event) => {
    const parsed = parseEvent(event);
    if (seenIds.has(parsed.id)) {
      throw new Error(`Duplicate event id: ${parsed.id}.`);
    }
    seenIds.add(parsed.id);
    return parsed;
  });

  const snapshot = record.snapshot ? parseSnapshot(record.snapshot) : undefined;

  return {
    version: BACKUP_VERSION,
    createdAt,
    deviceId,
    appVersion,
    events: sortEvents(events),
    snapshot,
  };
};

export const serializeBackupPayload = (payload: BackupPayload): string =>
  JSON.stringify(payload);

export const encryptBackupPayload = async (
  payload: BackupPayload,
): Promise<string> => encryptPayload(payload);

export const decryptBackupPayload = async (
  ciphertext: string,
): Promise<BackupPayload> => {
  const parsed = await decryptPayload<unknown>(ciphertext);
  return parseBackupPayload(parsed);
};

export const exportEncryptedBackup = async (
  db: PersistenceDb,
  input: BackupPayloadInput,
): Promise<string> => {
  const payload = await createBackupPayload(db, input);
  return encryptBackupPayload(payload);
};

export const importEncryptedBackup = async (
  db: PersistenceDb,
  ciphertext: string,
  mode: BackupImportMode,
): Promise<BackupImportResult> => {
  let payload: BackupPayload;
  try {
    payload = await decryptBackupPayload(ciphertext);
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    const kind: BackupDecryptionErrorKind = message.includes("invalid ghash tag")
      ? "invalidGhash"
      : "unknown";
    const label =
      kind === "invalidGhash"
        ? "Invalid encryption key."
        : "Failed to decrypt backup.";
    throw new BackupDecryptionError(kind, label, { cause: error });
  }

  return importBackupPayload(db, payload, mode);
};

export const importBackupPayload = async (
  db: PersistenceDb,
  payload: BackupPayload,
  mode: BackupImportMode,
): Promise<BackupImportResult> => {
  const events = sortEvents(payload.events);

  if (mode === "replace") {
    await clearPersistence(db);
    if (payload.snapshot) {
      await persistSnapshotAndEvents(db, payload.snapshot, events);
      return {
        mode,
        eventsImported: events.length,
        eventsSkipped: 0,
        snapshotApplied: true,
      };
    }
    await appendEvents(db, events);
    return {
      mode,
      eventsImported: events.length,
      eventsSkipped: 0,
      snapshotApplied: false,
    };
  }

  const existing = await db.select().from<EventLogRecord>(eventLog).all();
  const existingIds = new Set(existing.map((record) => record.id));
  const filtered = events.filter((event) => !existingIds.has(event.id));

  if (filtered.length > 0) {
    await appendEvents(db, filtered);
  }

  return {
    mode,
    eventsImported: filtered.length,
    eventsSkipped: events.length - filtered.length,
    snapshotApplied: false,
  };
};
