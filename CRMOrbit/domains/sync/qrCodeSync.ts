import { createLogger } from "@utils/logger";
import { createSyncBundle, parseSyncBundle } from "./automergeSync";
import type { AutomergeDoc } from "@automerge/schema";
import { nextId } from "@domains/shared/idGenerator";

const logger = createLogger("QRCodeSync");

const MAX_QR_SIZE = 2953;
const CHUNK_PREFIX = "crmorbit-sync";
const CHUNK_VERSION = 1;

export type SyncQRCodeChunk = {
  bundleId: string;
  index: number;
  total: number;
  data: string;
};

export type SyncQRCodeBatch = {
  kind: "single" | "chunked";
  chunks: Array<{
    index: number;
    total: number;
    payload: string;
  }>;
  bundleId?: string;
};

export type SyncQRCodeParseResult =
  | { kind: "single"; changes: Uint8Array }
  | { kind: "chunk"; chunk: SyncQRCodeChunk };

const buildChunkHeader = (
  bundleId: string,
  index: number,
  total: number,
): string => `${CHUNK_PREFIX}|${CHUNK_VERSION}|${bundleId}|${index}|${total}|`;

const parseChunkPayload = (payload: string): SyncQRCodeChunk | null => {
  if (!payload.startsWith(`${CHUNK_PREFIX}|`)) return null;

  const parts = payload.split("|");
  if (parts.length < 6) {
    throw new Error("Invalid sync QR chunk payload.");
  }

  const [, version, bundleId, indexStr, totalStr] = parts;
  const data = parts.slice(5).join("|");
  if (Number(version) !== CHUNK_VERSION) {
    throw new Error("Unsupported sync QR chunk version.");
  }

  const index = Number(indexStr);
  const total = Number(totalStr);
  if (!bundleId || !Number.isInteger(index) || !Number.isInteger(total)) {
    throw new Error("Invalid sync QR chunk metadata.");
  }
  if (index < 1 || total < 1 || index > total) {
    throw new Error("Sync QR chunk index out of range.");
  }

  return {
    bundleId,
    index,
    total,
    data,
  };
};

const chunkBundle = (bundle: string): SyncQRCodeChunk[] => {
  const bundleId = nextId("sync");
  let total = 1;
  let payloadSize = 0;

  while (true) {
    const headerLength = buildChunkHeader(bundleId, total, total).length;
    payloadSize = MAX_QR_SIZE - headerLength;
    if (payloadSize <= 0) {
      throw new Error("Sync QR chunk header exceeds maximum size.");
    }

    const nextTotal = Math.ceil(bundle.length / payloadSize) || 1;
    if (nextTotal === total) break;
    total = nextTotal;
  }

  const chunks: SyncQRCodeChunk[] = [];
  for (let i = 0; i < total; i += 1) {
    const data = bundle.slice(i * payloadSize, (i + 1) * payloadSize);
    chunks.push({
      bundleId,
      index: i + 1,
      total,
      data,
    });
  }

  return chunks;
};

const toQrPayloads = (chunks: SyncQRCodeChunk[]): SyncQRCodeBatch => {
  const total = chunks[0]?.total ?? 0;
  const bundleId = chunks[0]?.bundleId;

  const payloads = chunks.map((chunk) => ({
    index: chunk.index,
    total: chunk.total,
    payload: `${buildChunkHeader(
      chunk.bundleId,
      chunk.index,
      chunk.total,
    )}${chunk.data}`,
  }));

  return {
    kind: total > 1 ? "chunked" : "single",
    chunks: payloads,
    bundleId,
  };
};

/**
 * Generate QR code images for sync data.
 */
export const generateSyncQRCode = async (
  doc: AutomergeDoc,
  peerId: string = "manual-sync",
): Promise<SyncQRCodeBatch> => {
  try {
    const syncBundle = await createSyncBundle(doc, peerId);

    if (syncBundle.length <= MAX_QR_SIZE) {
      logger.info("Generated sync QR payload", { dataSize: syncBundle.length });
      return {
        kind: "single",
        chunks: [{ index: 1, total: 1, payload: syncBundle }],
      };
    }

    logger.warn("Sync data too large for single QR", {
      size: syncBundle.length,
      maxSize: MAX_QR_SIZE,
    });

    const chunks = chunkBundle(syncBundle);
    const batch = toQrPayloads(chunks);
    logger.info("Generated chunked sync QR payloads", {
      totalChunks: batch.chunks.length,
    });
    return batch;
  } catch (error) {
    logger.error("Failed to generate QR code", {}, error);
    throw error;
  }
};

/**
 * Parse sync data from scanned QR code.
 */
export const parseSyncQRCode = (qrData: string): SyncQRCodeParseResult => {
  try {
    const trimmed = qrData.trim();
    const chunk = parseChunkPayload(trimmed);
    if (chunk) {
      if (chunk.total === 1) {
        const changes = parseSyncBundle(chunk.data);
        logger.info("Parsed single sync QR chunk", { size: changes.length });
        return { kind: "single", changes };
      }

      logger.info("Parsed sync QR chunk", {
        bundleId: chunk.bundleId,
        index: chunk.index,
        total: chunk.total,
      });
      return { kind: "chunk", chunk };
    }

    const changes = parseSyncBundle(trimmed);
    logger.info("Parsed sync QR code", { size: changes.length });
    return { kind: "single", changes };
  } catch (error) {
    logger.error("Failed to parse QR code", {}, error);
    throw error;
  }
};

/**
 * Assemble a set of QR chunks into Automerge changes.
 */
export const assembleSyncChunks = (chunks: SyncQRCodeChunk[]): Uint8Array => {
  if (chunks.length === 0) {
    throw new Error("No sync QR chunks provided.");
  }

  const bundleId = chunks[0]?.bundleId;
  const total = chunks[0]?.total ?? 0;
  if (!bundleId || total < 1) {
    throw new Error("Invalid sync QR chunk bundle.");
  }

  const unique = new Map<number, SyncQRCodeChunk>();
  for (const chunk of chunks) {
    if (chunk.bundleId !== bundleId || chunk.total !== total) {
      throw new Error("Sync QR chunk metadata mismatch.");
    }
    unique.set(chunk.index, chunk);
  }

  if (unique.size !== total) {
    throw new Error("Missing sync QR chunks.");
  }

  const ordered = Array.from(unique.values()).sort(
    (left, right) => left.index - right.index,
  );
  const bundle = ordered.map((chunk) => chunk.data).join("");
  const changes = parseSyncBundle(bundle);
  logger.info("Assembled sync QR chunks", { size: changes.length });
  return changes;
};

/**
 * Generate WebRTC offer as QR code.
 */
export const generateWebRTCOfferQR = async (
  offerSDP: string,
): Promise<string> => {
  logger.info("Generated WebRTC offer QR payload");
  return offerSDP;
};
