import { fromByteArray, toByteArray } from "base64-js";

import { createLogger } from "@utils/logger";
import type { AutomergeDoc } from "@automerge/schema";
import { nextId } from "@domains/shared/idGenerator";

import { useSyncStore } from "./syncState";
import { localNetworkSync } from "./localNetworkSync";
import { createWebRTCConnection } from "./webrtcSync";
import {
  applyReceivedChanges,
  getChangesSinceLastSync,
  saveSyncCheckpoint,
} from "./automergeSync";
import {
  assembleSyncChunks,
  generateSyncQRCode,
  parseSyncQRCode,
  type SyncQRCodeBatch,
  type SyncQRCodeChunk,
} from "./qrCodeSync";
import type { DeviceInfo, SyncMessage, SyncMethod, SyncSession } from "./types";

const logger = createLogger("SyncOrchestrator");

type WireSyncMessage = Omit<SyncMessage, "changes"> & { changes?: string };

type ManualSyncResult =
  | {
      status: "pending";
      bundleId: string;
      received: number;
      total: number;
    }
  | {
      status: "applied";
      doc: AutomergeDoc;
    };

const encodeUtf8Fallback = (value: string): Uint8Array => {
  const bytes: number[] = [];
  for (let i = 0; i < value.length; i += 1) {
    const codePoint = value.codePointAt(i);
    if (codePoint === undefined) {
      continue;
    }
    if (codePoint > 0xffff) {
      i += 1;
    }
    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6));
      bytes.push(0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(0xe0 | (codePoint >> 12));
      bytes.push(0x80 | ((codePoint >> 6) & 0x3f));
      bytes.push(0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0x10ffff) {
      bytes.push(0xf0 | (codePoint >> 18));
      bytes.push(0x80 | ((codePoint >> 12) & 0x3f));
      bytes.push(0x80 | ((codePoint >> 6) & 0x3f));
      bytes.push(0x80 | (codePoint & 0x3f));
    } else {
      throw new Error("Invalid Unicode code point.");
    }
  }
  return Uint8Array.from(bytes);
};

const decodeUtf8Fallback = (bytes: Uint8Array): string => {
  let result = "";
  for (let i = 0; i < bytes.length; i += 1) {
    const byte1 = bytes[i];
    if (byte1 <= 0x7f) {
      result += String.fromCharCode(byte1);
      continue;
    }

    if (byte1 >= 0xc2 && byte1 <= 0xdf) {
      if (i + 1 >= bytes.length) {
        throw new Error("Invalid UTF-8 sequence.");
      }
      const byte2 = bytes[++i];
      if ((byte2 & 0xc0) !== 0x80) {
        throw new Error("Invalid UTF-8 continuation byte.");
      }
      const codePoint = ((byte1 & 0x1f) << 6) | (byte2 & 0x3f);
      result += String.fromCharCode(codePoint);
      continue;
    }

    if (byte1 >= 0xe0 && byte1 <= 0xef) {
      if (i + 2 >= bytes.length) {
        throw new Error("Invalid UTF-8 sequence.");
      }
      const byte2 = bytes[++i];
      const byte3 = bytes[++i];
      if ((byte2 & 0xc0) !== 0x80 || (byte3 & 0xc0) !== 0x80) {
        throw new Error("Invalid UTF-8 continuation byte.");
      }
      if (byte1 === 0xe0 && byte2 < 0xa0) {
        throw new Error("Overlong UTF-8 sequence.");
      }
      if (byte1 === 0xed && byte2 >= 0xa0) {
        throw new Error("UTF-8 sequence encodes surrogate.");
      }
      const codePoint =
        ((byte1 & 0x0f) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f);
      result += String.fromCharCode(codePoint);
      continue;
    }

    if (byte1 >= 0xf0 && byte1 <= 0xf4) {
      if (i + 3 >= bytes.length) {
        throw new Error("Invalid UTF-8 sequence.");
      }
      const byte2 = bytes[++i];
      const byte3 = bytes[++i];
      const byte4 = bytes[++i];
      if (
        (byte2 & 0xc0) !== 0x80 ||
        (byte3 & 0xc0) !== 0x80 ||
        (byte4 & 0xc0) !== 0x80
      ) {
        throw new Error("Invalid UTF-8 continuation byte.");
      }
      if (byte1 === 0xf0 && byte2 < 0x90) {
        throw new Error("Overlong UTF-8 sequence.");
      }
      if (byte1 === 0xf4 && byte2 > 0x8f) {
        throw new Error("UTF-8 code point out of range.");
      }
      let codePoint =
        ((byte1 & 0x07) << 18) |
        ((byte2 & 0x3f) << 12) |
        ((byte3 & 0x3f) << 6) |
        (byte4 & 0x3f);
      if (codePoint > 0x10ffff) {
        throw new Error("UTF-8 code point out of range.");
      }
      codePoint -= 0x10000;
      result += String.fromCharCode(
        0xd800 + (codePoint >> 10),
        0xdc00 + (codePoint & 0x3ff),
      );
      continue;
    }

    throw new Error("Invalid UTF-8 leading byte.");
  }

  return result;
};

const encodeString = (value: string): Uint8Array => {
  const Encoder = globalThis.TextEncoder;
  if (Encoder) {
    return new Encoder().encode(value);
  }
  return encodeUtf8Fallback(value);
};

const decodeString = (value: Uint8Array): string => {
  const Decoder = globalThis.TextDecoder;
  if (Decoder) {
    return new Decoder().decode(value);
  }
  return decodeUtf8Fallback(value);
};

const encodeSyncMessage = (message: SyncMessage): Uint8Array => {
  const wire: WireSyncMessage = {
    ...message,
    changes: message.changes ? fromByteArray(message.changes) : undefined,
  };
  return encodeString(JSON.stringify(wire));
};

const decodeSyncMessage = (payload: Uint8Array): SyncMessage => {
  const parsed = JSON.parse(decodeString(payload)) as WireSyncMessage;
  if (
    !parsed ||
    typeof parsed.type !== "string" ||
    typeof parsed.deviceId !== "string" ||
    typeof parsed.timestamp !== "string"
  ) {
    throw new Error("Invalid sync message.");
  }

  return {
    ...parsed,
    changes: parsed.changes ? toByteArray(parsed.changes) : undefined,
  };
};

class SyncOrchestrator {
  private currentDoc: AutomergeDoc | null = null;
  private pendingQrBundles = new Map<string, Map<number, SyncQRCodeChunk>>();
  private sessionByPeer = new Map<string, string>();
  private pendingWebRTCResponses = new Map<
    string,
    {
      resolve: (doc: AutomergeDoc) => void;
      reject: (error: unknown) => void;
    }
  >();

  /**
   * Initialize sync with current document.
   */
  initialize(doc: AutomergeDoc, deviceId?: string): void {
    this.currentDoc = doc;
    if (deviceId) {
      useSyncStore.getState().setLocalDeviceId(deviceId);
    }
    localNetworkSync.setSyncHandler(this.handleLocalNetworkRequest);
    logger.info("Sync orchestrator initialized");
  }

  /**
   * Start discovering peers automatically.
   */
  async startAutoDiscovery(): Promise<void> {
    try {
      await localNetworkSync.startAdvertising();
      localNetworkSync.startScanning();
      logger.info("Auto-discovery started");
    } catch (error) {
      logger.error("Failed to start auto-discovery", {}, error);
      throw error;
    }
  }

  /**
   * Stop auto-discovery.
   */
  stopAutoDiscovery(): void {
    localNetworkSync.stopAdvertising();
    localNetworkSync.stopScanning();
    localNetworkSync.dispose();
    logger.info("Auto-discovery stopped");
  }

  /**
   * Sync with a specific peer using local network when available.
   */
  async syncWithPeer(
    peer: DeviceInfo,
    options?: { getWebRTCAnswer?: (offer: string) => Promise<string> },
  ): Promise<AutomergeDoc> {
    if (!this.currentDoc) throw new Error("Document not initialized");

    try {
      if (peer.ipAddress) {
        logger.info("Attempting local network sync", { peer: peer.deviceId });
        return await this.syncViaLocalNetwork(peer);
      }

      if (!options?.getWebRTCAnswer) {
        throw new Error(
          "WebRTC sync requires an answer provider. Provide getWebRTCAnswer to continue.",
        );
      }

      logger.info("Local network unavailable, using WebRTC", {
        peer: peer.deviceId,
      });
      return await this.syncViaWebRTC(peer, options.getWebRTCAnswer);
    } catch (error) {
      logger.error("Peer sync failed", { peer: peer.deviceId }, error);
      useSyncStore.getState().setStatus("error");
      throw error;
    }
  }

  /**
   * Generate QR code(s) for manual sync.
   */
  async generateManualSyncQR(
    peerId: string = "manual-sync",
  ): Promise<SyncQRCodeBatch> {
    if (!this.currentDoc) throw new Error("Document not initialized");
    return generateSyncQRCode(this.currentDoc, peerId);
  }

  /**
   * Apply changes from scanned QR code data.
   */
  async applyManualSyncQR(
    qrData: string,
    peerId: string = "manual-sync",
  ): Promise<ManualSyncResult> {
    if (!this.currentDoc) throw new Error("Document not initialized");

    useSyncStore.getState().setStatus("syncing");
    const result = parseSyncQRCode(qrData);
    if (result.kind === "single") {
      const updatedDoc = this.applyIncomingChanges(result.changes);
      await saveSyncCheckpoint(updatedDoc, peerId);
      useSyncStore.getState().setStatus("completed");
      return { status: "applied", doc: updatedDoc };
    }

    const { bundleId, index, total } = result.chunk;
    const bundle = this.pendingQrBundles.get(bundleId) ?? new Map();
    bundle.set(index, result.chunk);
    this.pendingQrBundles.set(bundleId, bundle);

    if (bundle.size < total) {
      return {
        status: "pending",
        bundleId,
        received: bundle.size,
        total,
      };
    }

    const chunks = Array.from(bundle.values());
    this.pendingQrBundles.delete(bundleId);
    const changes = assembleSyncChunks(chunks);
    const updatedDoc = this.applyIncomingChanges(changes);
    await saveSyncCheckpoint(updatedDoc, peerId);
    useSyncStore.getState().setStatus("completed");
    return { status: "applied", doc: updatedDoc };
  }

  private async syncViaLocalNetwork(peer: DeviceInfo): Promise<AutomergeDoc> {
    if (!this.currentDoc) throw new Error("Document not initialized");

    const sessionId = this.startSession(peer.deviceId, "local-network");
    try {
      const localDeviceId = this.getLocalDeviceId();
      const outgoingChanges = await getChangesSinceLastSync(
        this.currentDoc,
        peer.deviceId,
      );
      this.updateSession(sessionId, {
        status: "syncing",
        changesSent: outgoingChanges.length,
      });

      const request: SyncMessage = {
        type: "sync-request",
        deviceId: localDeviceId,
        timestamp: new Date().toISOString(),
        changes: outgoingChanges,
      };

      const responsePayload = await localNetworkSync.syncWithPeer(
        peer,
        encodeSyncMessage(request),
      );

      const response = decodeSyncMessage(responsePayload);
      if (response.type !== "sync-response") {
        throw new Error("Unexpected sync response type.");
      }

      const updatedDoc = this.applyIncomingChanges(
        response.changes ?? new Uint8Array(),
      );
      await saveSyncCheckpoint(updatedDoc, peer.deviceId);

      this.updateSession(sessionId, {
        changesReceived: response.changes?.length ?? 0,
      });

      this.completeSession(sessionId);
      return updatedDoc;
    } catch (error) {
      this.failSession(sessionId, error);
      throw error;
    }
  }

  private async syncViaWebRTC(
    peer: DeviceInfo,
    getAnswer: (offer: string) => Promise<string>,
  ): Promise<AutomergeDoc> {
    if (!this.currentDoc) throw new Error("Document not initialized");

    const sessionId = this.startSession(peer.deviceId, "webrtc");
    this.sessionByPeer.set(peer.deviceId, sessionId);
    const responsePromise = new Promise<AutomergeDoc>((resolve, reject) => {
      this.pendingWebRTCResponses.set(peer.deviceId, { resolve, reject });
    });
    try {
      const connection = createWebRTCConnection();

      const offerSDP = await connection.createOffer((receivedData) => {
        void this.handleWebRTCMessage(peer.deviceId, connection, receivedData);
      });

      const answerSDP = await getAnswer(offerSDP);
      await connection.acceptAnswer(answerSDP);

      const changes = await getChangesSinceLastSync(
        this.currentDoc,
        peer.deviceId,
      );
      connection.sendData(
        encodeSyncMessage({
          type: "sync-request",
          deviceId: this.getLocalDeviceId(),
          timestamp: new Date().toISOString(),
          changes,
        }),
      );

      this.updateSession(sessionId, {
        status: "syncing",
        changesSent: changes.length,
      });

      const updatedDoc = await responsePromise;
      this.pendingWebRTCResponses.delete(peer.deviceId);
      this.completeSession(sessionId);
      return updatedDoc;
    } catch (error) {
      this.rejectPendingWebRTCResponse(peer.deviceId, error);
      this.failSession(sessionId, error);
      throw error;
    } finally {
      this.sessionByPeer.delete(peer.deviceId);
    }
  }

  private handleLocalNetworkRequest = async (
    payload: Uint8Array,
  ): Promise<Uint8Array> => {
    if (!this.currentDoc) throw new Error("Document not initialized");

    const request = decodeSyncMessage(payload);
    if (request.type !== "sync-request") {
      throw new Error("Unexpected sync request type.");
    }

    const peerId = request.deviceId;
    const sessionId = this.startSession(peerId, "local-network");

    try {
      this.updateSession(sessionId, {
        status: "syncing",
        changesReceived: request.changes?.length ?? 0,
      });

      const updatedDoc = this.applyIncomingChanges(
        request.changes ?? new Uint8Array(),
      );

      const outgoingChanges = await getChangesSinceLastSync(updatedDoc, peerId);
      await saveSyncCheckpoint(updatedDoc, peerId);

      this.updateSession(sessionId, {
        changesSent: outgoingChanges.length,
      });

      this.completeSession(sessionId);

      const response: SyncMessage = {
        type: "sync-response",
        deviceId: this.getLocalDeviceId(),
        timestamp: new Date().toISOString(),
        changes: outgoingChanges,
      };
      return encodeSyncMessage(response);
    } catch (error) {
      this.failSession(sessionId, error);
      throw error;
    }
  };

  private async handleWebRTCMessage(
    peerId: string,
    connection: ReturnType<typeof createWebRTCConnection>,
    payload: Uint8Array,
  ): Promise<void> {
    if (!this.currentDoc) {
      throw new Error("Document not initialized");
    }

    try {
      const message = decodeSyncMessage(payload);

      let updatedDoc = this.currentDoc;
      if (message.changes) {
        updatedDoc = this.applyIncomingChanges(message.changes);
        await saveSyncCheckpoint(updatedDoc, peerId);
        const sessionId = this.sessionByPeer.get(peerId);
        if (sessionId) {
          this.updateSession(sessionId, {
            changesReceived: message.changes.length,
          });
        }
      }

      if (message.type === "sync-request") {
        const outgoingChanges = await getChangesSinceLastSync(
          updatedDoc,
          peerId,
        );
        connection.sendData(
          encodeSyncMessage({
            type: "sync-response",
            deviceId: this.getLocalDeviceId(),
            timestamp: new Date().toISOString(),
            changes: outgoingChanges,
          }),
        );

        const sessionId = this.sessionByPeer.get(peerId);
        if (sessionId) {
          this.updateSession(sessionId, {
            changesSent: outgoingChanges.length,
          });
        }
      }

      if (message.type === "sync-response") {
        this.resolvePendingWebRTCResponse(peerId, updatedDoc);
      }
    } catch (error) {
      const sessionId = this.sessionByPeer.get(peerId);
      if (sessionId) {
        this.failSession(sessionId, error);
      }
      this.rejectPendingWebRTCResponse(peerId, error);
      logger.error("Failed to handle WebRTC message", { peerId }, error);
    }
  }

  private resolvePendingWebRTCResponse(
    peerId: string,
    doc: AutomergeDoc,
  ): void {
    const pending = this.pendingWebRTCResponses.get(peerId);
    if (pending) {
      pending.resolve(doc);
      this.pendingWebRTCResponses.delete(peerId);
    }
  }

  private rejectPendingWebRTCResponse(peerId: string, error: unknown): void {
    const pending = this.pendingWebRTCResponses.get(peerId);
    if (pending) {
      pending.reject(error);
      this.pendingWebRTCResponses.delete(peerId);
    }
  }

  private applyIncomingChanges(changes: Uint8Array): AutomergeDoc {
    if (!this.currentDoc) {
      throw new Error("Document not initialized");
    }

    const updatedDoc = applyReceivedChanges(this.currentDoc, changes);
    this.currentDoc = updatedDoc;

    return updatedDoc;
  }

  private startSession(peerId: string, method: SyncMethod): string {
    const session: SyncSession = {
      id: nextId("sync"),
      peerId,
      method,
      status: "connecting",
      startedAt: new Date().toISOString(),
      changesSent: 0,
      changesReceived: 0,
    };
    useSyncStore.getState().startSession(session);
    return session.id;
  }

  private updateSession(
    sessionId: string,
    updates: Partial<SyncSession>,
  ): void {
    useSyncStore.getState().updateSession(sessionId, updates);
  }

  private completeSession(sessionId: string): void {
    this.updateSession(sessionId, {
      status: "completed",
      completedAt: new Date().toISOString(),
    });
    useSyncStore.getState().completeSession(sessionId);
  }

  private failSession(sessionId: string, error: unknown): void {
    const message =
      error instanceof Error ? error.message : "Unknown sync error";
    this.updateSession(sessionId, {
      status: "error",
      error: message,
      completedAt: new Date().toISOString(),
    });
    useSyncStore.getState().setStatus("error");
  }

  private getLocalDeviceId(): string {
    const deviceId = useSyncStore.getState().localDeviceId?.trim() ?? "";
    if (!deviceId) {
      throw new Error("Local device ID not set.");
    }
    return deviceId;
  }
}

export const syncOrchestrator = new SyncOrchestrator();
