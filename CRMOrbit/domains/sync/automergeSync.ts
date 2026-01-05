import Automerge from "automerge";
import type { Change, Doc } from "automerge";
import type { AutomergeDoc } from "@automerge/schema";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fromByteArray, toByteArray } from "base64-js";
import { createLogger } from "@utils/logger";

const logger = createLogger("AutomergeSync");

const LAST_SYNC_VERSION_KEY = "last_sync_version";
const SNAPSHOT_FORMAT = "crm-sync-snapshot-v1";

const sanitizeDocForAutomerge = (doc: AutomergeDoc): AutomergeDoc => {
  try {
    return JSON.parse(JSON.stringify(doc)) as AutomergeDoc;
  } catch (error) {
    logger.error("Failed to sanitize doc for sync", {}, error);
    throw error;
  }
};

const ensureAutomergeDoc = (doc: AutomergeDoc): Doc<AutomergeDoc> => {
  const candidate = doc as Doc<AutomergeDoc>;
  try {
    Automerge.save(candidate);
    return candidate;
  } catch {
    const sanitized = sanitizeDocForAutomerge(doc);
    try {
      return Automerge.from(sanitized);
    } catch (error) {
      logger.error("Failed to coerce doc into Automerge", {}, error);
      throw error;
    }
  }
};

type TextEncoderLike = {
  encode: (input?: string) => Uint8Array;
};

type TextDecoderLike = {
  decode: (input?: Uint8Array) => string;
};

const getTextEncoder = (): TextEncoderLike => {
  const Encoder = globalThis.TextEncoder as
    | (new () => TextEncoderLike)
    | undefined;
  if (!Encoder) {
    throw new Error("TextEncoder is not available.");
  }
  return new Encoder();
};

const getTextDecoder = (): TextDecoderLike => {
  const Decoder = globalThis.TextDecoder as
    | (new () => TextDecoderLike)
    | undefined;
  if (!Decoder) {
    throw new Error("TextDecoder is not available.");
  }
  return new Decoder();
};

const parseJsonChanges = (changes: Uint8Array): Change[] => {
  const payload = getTextDecoder().decode(changes);
  const parsed = JSON.parse(payload) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid sync payload: expected change array.");
  }
  return parsed as Change[];
};

const BINARY_CHANGES_FORMAT = "crm-sync-binary-v1";

const parseStructuredChangesFromParsed = (parsed: unknown): Change[] | null => {
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  if (!("format" in parsed) || !("changes" in parsed)) {
    return null;
  }

  const { format, changes: entries } = parsed as {
    format?: unknown;
    changes?: unknown;
  };
  if (format !== BINARY_CHANGES_FORMAT || !Array.isArray(entries)) {
    return null;
  }

  const decoded: Change[] = [];
  for (const entry of entries) {
    if (
      entry &&
      typeof entry === "object" &&
      "kind" in entry &&
      "data" in entry
    ) {
      const { kind, data } = entry as { kind: string; data: unknown };
      if (kind === "binary" && typeof data === "string") {
        decoded.push(toByteArray(data) as unknown as Change);
        continue;
      }
      if (kind === "json") {
        decoded.push(data as Change);
        continue;
      }
    }
    if (typeof entry === "string") {
      decoded.push(toByteArray(entry) as unknown as Change);
      continue;
    }
    decoded.push(entry as Change);
  }

  return decoded;
};

const decodeJsonChanges = (changes: Uint8Array): Change[] | null => {
  let payload = "";
  try {
    payload = getTextDecoder().decode(changes).trim();
  } catch {
    return null;
  }

  if (!payload) {
    return [];
  }

  const firstChar = payload[0];
  if (firstChar !== "[" && firstChar !== "{") {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload) as unknown;
  } catch {
    return null;
  }

  if (Array.isArray(parsed)) {
    return parsed as Change[];
  }

  return parseStructuredChangesFromParsed(parsed);
};

const parseSnapshotPayload = (changes: Uint8Array): string | null => {
  let payload = "";
  try {
    payload = getTextDecoder().decode(changes).trim();
  } catch {
    return null;
  }

  if (!payload || payload[0] !== "{") {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload) as unknown;
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const { format, snapshot } = parsed as {
    format?: unknown;
    snapshot?: unknown;
  };
  if (format !== SNAPSHOT_FORMAT || typeof snapshot !== "string") {
    return null;
  }

  return snapshot;
};

const encodeChanges = (changes: Change[]): Uint8Array => {
  if (changes.length === 0) return new Uint8Array();
  const encodeChange = (
    Automerge as unknown as {
      encodeChange?: (change: Change) => Uint8Array;
    }
  ).encodeChange;
  if (!encodeChange) {
    const hasBinary = changes.some((change) => change instanceof Uint8Array);
    if (!hasBinary) {
      const payload = JSON.stringify(changes);
      return getTextEncoder().encode(payload);
    }

    const payload = JSON.stringify({
      format: BINARY_CHANGES_FORMAT,
      changes: changes.map((change) =>
        change instanceof Uint8Array
          ? { kind: "binary", data: fromByteArray(change) }
          : { kind: "json", data: change },
      ),
    });
    return getTextEncoder().encode(payload);
  }
  const encoded = changes.map((change) => {
    if (change instanceof Uint8Array) {
      return change;
    }
    if (!encodeChange) {
      throw new Error("Automerge.encodeChange is unavailable.");
    }
    return encodeChange(change);
  });

  const total = encoded.reduce((sum, chunk) => sum + 4 + chunk.length, 0);
  const buffer = new Uint8Array(total);
  const view = new DataView(buffer.buffer);
  let offset = 0;
  for (const chunk of encoded) {
    view.setUint32(offset, chunk.length, false);
    offset += 4;
    buffer.set(chunk, offset);
    offset += chunk.length;
  }
  return buffer;
};

const decodeChangeFromBytes = (
  bytes: Uint8Array,
  decodeChange?: (buffer: Uint8Array) => unknown,
): Change => {
  if (!decodeChange) {
    return bytes as unknown as Change;
  }
  const result = decodeChange(bytes);
  if (Array.isArray(result)) {
    return (result as [Change, number])[0];
  }
  if (result && typeof result === "object" && "change" in result) {
    return (result as { change: Change }).change;
  }
  return result as Change;
};

const decodeLengthPrefixedChanges = (
  changes: Uint8Array,
  decodeChange?: (buffer: Uint8Array) => unknown,
): Change[] => {
  const decoded: Change[] = [];
  const view = new DataView(
    changes.buffer,
    changes.byteOffset,
    changes.byteLength,
  );
  let offset = 0;
  while (offset < changes.length) {
    if (offset + 4 > changes.length) {
      throw new Error("Invalid sync payload length prefix.");
    }
    const length = view.getUint32(offset, false);
    offset += 4;
    if (!Number.isFinite(length) || length <= 0) {
      throw new Error("Invalid sync payload length prefix.");
    }
    if (offset + length > changes.length) {
      throw new Error("Invalid sync payload length prefix.");
    }
    const slice = changes.subarray(offset, offset + length);
    decoded.push(decodeChangeFromBytes(slice, decodeChange));
    offset += length;
  }
  return decoded;
};

const decodeChangesLegacy = (
  changes: Uint8Array,
  decodeChange?: (buffer: Uint8Array) => unknown,
  encodeChange?: (change: Change) => Uint8Array,
): Change[] => {
  if (!decodeChange) {
    return parseJsonChanges(changes);
  }

  const decoded: Change[] = [];
  let offset = 0;

  while (offset < changes.length) {
    const slice = changes.subarray(offset);
    const result = decodeChange(slice);

    if (Array.isArray(result)) {
      const [change, bytes] = result as [Change, number];
      if (!Number.isFinite(bytes) || bytes <= 0) {
        throw new Error("Invalid decoded change length.");
      }
      decoded.push(change);
      offset += bytes;
      continue;
    }

    if (result && typeof result === "object" && "change" in result) {
      const changeResult = result as {
        change: Change;
        bytes?: number;
        length?: number;
        bytesRead?: number;
      };
      const bytes =
        changeResult.bytes ??
        changeResult.length ??
        changeResult.bytesRead ??
        0;
      if (!Number.isFinite(bytes) || bytes <= 0) {
        throw new Error("Invalid decoded change length.");
      }
      decoded.push(changeResult.change);
      offset += bytes;
      continue;
    }

    const change = result as Change;
    if (!encodeChange) {
      throw new Error("Automerge.encodeChange is unavailable.");
    }
    const encoded = encodeChange(change);
    if (encoded.length <= 0) {
      throw new Error("Invalid decoded change length.");
    }
    decoded.push(change);
    offset += encoded.length;
  }

  return decoded;
};

const decodeChanges = (changes: Uint8Array): Change[] => {
  if (changes.length === 0) return [];
  const decodeChange = (
    Automerge as unknown as {
      decodeChange?: (buffer: Uint8Array) => unknown;
    }
  ).decodeChange;
  const encodeChange = (
    Automerge as unknown as {
      encodeChange?: (change: Change) => Uint8Array;
    }
  ).encodeChange;

  const jsonChanges = decodeJsonChanges(changes);
  if (jsonChanges) {
    return jsonChanges;
  }

  try {
    return decodeLengthPrefixedChanges(changes, decodeChange);
  } catch (error) {
    logger.warn(
      "Failed to decode length-prefixed changes, falling back",
      {},
      error,
    );
  }

  try {
    return decodeChangesLegacy(changes, decodeChange, encodeChange);
  } catch (error) {
    logger.warn(
      "Failed to decode binary changes, falling back to JSON",
      {},
      error,
    );
    return parseJsonChanges(changes);
  }
};

const encodeSnapshot = (snapshot: Uint8Array | string): string => {
  const bytes =
    typeof snapshot === "string" ? getTextEncoder().encode(snapshot) : snapshot;
  return fromByteArray(bytes);
};

const loadSnapshot = (encoded: string): Doc<AutomergeDoc> => {
  let bytes: Uint8Array | null = null;
  try {
    bytes = toByteArray(encoded);
  } catch {
    bytes = null;
  }

  if (bytes) {
    try {
      return Automerge.load<AutomergeDoc>(bytes as unknown as string);
    } catch (error) {
      const decoded = getTextDecoder().decode(bytes);
      try {
        return Automerge.load<AutomergeDoc>(decoded);
      } catch {
        throw error;
      }
    }
  }

  return Automerge.load<AutomergeDoc>(encoded);
};

/**
 * Get changes since last sync with a peer.
 */
export const getChangesSinceLastSync = async (
  currentDoc: AutomergeDoc,
  peerId: string,
): Promise<Uint8Array> => {
  try {
    const lastSyncSnapshot = await AsyncStorage.getItem(
      `${LAST_SYNC_VERSION_KEY}_${peerId}`,
    );

    const current = ensureAutomergeDoc(currentDoc);
    const encodeChange = (
      Automerge as unknown as {
        encodeChange?: (change: Change) => Uint8Array;
      }
    ).encodeChange;
    if (!encodeChange) {
      const snapshotPayload = JSON.stringify({
        format: SNAPSHOT_FORMAT,
        snapshot: Automerge.save(current),
      });
      logger.info("Syncing via snapshot payload", { peerId });
      return getTextEncoder().encode(snapshotPayload);
    }
    const changes = lastSyncSnapshot
      ? Automerge.getChanges(loadSnapshot(lastSyncSnapshot), current)
      : Automerge.getAllChanges(current);

    if (!lastSyncSnapshot) {
      logger.info("First sync with peer, sending all changes", { peerId });
    }

    logger.info("Generated changes for sync", {
      peerId,
      changeCount: changes.length,
    });

    return encodeChanges(changes);
  } catch (error) {
    logger.error("Failed to get changes for sync", { peerId }, error);
    throw error;
  }
};

/**
 * Apply received changes to current document.
 */
export const applyReceivedChanges = (
  currentDoc: AutomergeDoc,
  changes: Uint8Array,
): AutomergeDoc => {
  try {
    if (changes.length === 0) {
      logger.info("No incoming changes to apply");
      return currentDoc;
    }

    const snapshot = parseSnapshotPayload(changes);
    if (snapshot) {
      const remoteDoc = Automerge.load<AutomergeDoc>(snapshot);
      const localDoc = ensureAutomergeDoc(currentDoc);
      try {
        return Automerge.merge(localDoc, remoteDoc);
      } catch {
        return remoteDoc;
      }
    }

    const decodedChanges = decodeChanges(changes);
    const newDoc = Automerge.applyChanges(
      ensureAutomergeDoc(currentDoc),
      decodedChanges,
    );

    logger.info("Applied received changes", {
      changeCount: decodedChanges.length,
    });
    return newDoc;
  } catch (error) {
    logger.error("Failed to apply changes", {}, error);
    throw error;
  }
};

/**
 * Save sync checkpoint for a peer.
 */
export const saveSyncCheckpoint = async (
  doc: AutomergeDoc,
  peerId: string,
): Promise<void> => {
  try {
    const snapshot = Automerge.save(ensureAutomergeDoc(doc));
    const encodedSnapshot = encodeSnapshot(snapshot);
    await AsyncStorage.setItem(
      `${LAST_SYNC_VERSION_KEY}_${peerId}`,
      encodedSnapshot,
    );

    logger.info("Saved sync checkpoint", { peerId });
  } catch (error) {
    logger.error("Failed to save sync checkpoint", { peerId }, error);
  }
};

/**
 * Create a sync bundle for QR code transfer.
 */
export const createSyncBundle = async (
  currentDoc: AutomergeDoc,
  peerId: string = "qr-transfer",
): Promise<string> => {
  const changes = await getChangesSinceLastSync(currentDoc, peerId);
  const bundle = fromByteArray(changes);

  if (bundle.length > 2000) {
    logger.warn("Sync bundle large, may need multiple QR codes", {
      size: bundle.length,
    });
  }

  return bundle;
};

/**
 * Parse sync bundle from QR code.
 */
export const parseSyncBundle = (qrData: string): Uint8Array => {
  const trimmed = qrData.trim();
  if (!trimmed) return new Uint8Array();
  return toByteArray(trimmed);
};
