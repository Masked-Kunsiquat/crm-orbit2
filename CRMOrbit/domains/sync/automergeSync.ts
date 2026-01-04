import Automerge from "automerge";
import type { Change, Doc } from "automerge";
import type { AutomergeDoc } from "@automerge/schema";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fromByteArray, toByteArray } from "base64-js";
import { createLogger } from "@utils/logger";

const logger = createLogger("AutomergeSync");

const LAST_SYNC_VERSION_KEY = "last_sync_version";

const asAutomergeDoc = (doc: AutomergeDoc): Doc<AutomergeDoc> =>
  doc as Doc<AutomergeDoc>;

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

const encodeChanges = (changes: Change[]): Uint8Array => {
  if (changes.length === 0) return new Uint8Array();
  const payload = JSON.stringify(changes);
  return getTextEncoder().encode(payload);
};

const decodeChanges = (changes: Uint8Array): Change[] => {
  if (changes.length === 0) return [];
  const payload = getTextDecoder().decode(changes);
  const parsed = JSON.parse(payload) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid sync payload: expected change array.");
  }
  return parsed as Change[];
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

    const current = asAutomergeDoc(currentDoc);
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

    const decodedChanges = decodeChanges(changes);
    const newDoc = Automerge.applyChanges(
      asAutomergeDoc(currentDoc),
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
    const snapshot = Automerge.save(asAutomergeDoc(doc));
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
  const base64 = fromByteArray(changes);

  if (base64.length > 2000) {
    logger.warn("Sync bundle large, may need multiple QR codes", {
      size: base64.length,
    });
  }

  return base64;
};

/**
 * Parse sync bundle from QR code.
 */
export const parseSyncBundle = (qrData: string): Uint8Array => {
  const trimmed = qrData.trim();
  if (!trimmed) return new Uint8Array();
  return toByteArray(trimmed);
};
