import TcpSocket from "react-native-tcp-socket";
import Zeroconf from "react-native-zeroconf";

import { useSyncStore } from "./syncState";
import { createLogger } from "@utils/logger";
import type { DeviceInfo } from "./types";

const logger = createLogger("LocalNetworkSync");

const SERVICE_TYPE = "_crmorbit._tcp";
const SERVICE_DOMAIN = "local.";
const DEFAULT_PORT = 8765;
const FRAME_HEADER_BYTES = 4;
const MAX_FRAME_SIZE = 10 * 1024 * 1024;

type ZeroconfTxtRecord = Record<string, string | undefined>;

type ZeroconfService = {
  name?: string;
  txt?: ZeroconfTxtRecord;
  addresses?: string[];
  port?: number;
};

type ZeroconfLike = {
  on: (event: "resolved", handler: (service: ZeroconfService) => void) => void;
  on: (event: "remove", handler: (service: ZeroconfService) => void) => void;
  on: (event: "error", handler: (error: unknown) => void) => void;
  publishService: (
    type: string,
    protocol: "tcp" | "udp",
    domain: string,
    name: string,
    port: number,
    txt: ZeroconfTxtRecord,
  ) => void;
  unpublishService: (type: string, protocol: "tcp" | "udp") => void;
  scan: (type: string, protocol: "tcp" | "udp", domain: string) => void;
  stop: () => void;
};

type ZeroconfConstructor = {
  new (): ZeroconfLike;
};

type TcpSocketLike = {
  on: (
    event: "data" | "error" | "close",
    handler: (data: unknown) => void,
  ) => void;
  write: (data: Uint8Array) => void;
  destroy: () => void;
};

type TcpServerLike = {
  listen: (
    options: { port: number; host?: string },
    callback?: () => void,
  ) => void;
  close: () => void;
};

type TcpSocketModule = {
  createServer: (handler: (socket: TcpSocketLike) => void) => TcpServerLike;
  connect: (
    options: { host: string; port: number },
    callback?: () => void,
  ) => TcpSocketLike;
};

type SyncRequestHandler = (payload: Uint8Array) => Promise<Uint8Array>;

const createZeroconf = (): ZeroconfLike => {
  const Constructor = Zeroconf as unknown as ZeroconfConstructor;
  return new Constructor();
};

const createTcpSocket = (): TcpSocketModule => {
  return TcpSocket as unknown as TcpSocketModule;
};

const resolveDeviceId = (): string => {
  const deviceId = useSyncStore.getState().localDeviceId.trim();
  if (!deviceId) {
    throw new Error(
      "Local device ID not set. Initialize sync before advertising.",
    );
  }
  return deviceId;
};

const resolveDeviceName = (deviceId: string): string => {
  const suffix = deviceId.slice(-4);
  return suffix ? `CRM Orbit ${suffix}` : "CRM Orbit Device";
};

const selectAddress = (addresses?: string[]): string | undefined => {
  if (!addresses || addresses.length === 0) return undefined;
  const ipv4 = addresses.find((address) => address.includes("."));
  return ipv4 || addresses[0];
};

const concatBuffers = (left: Uint8Array, right: Uint8Array): Uint8Array => {
  if (left.length === 0) return right;
  if (right.length === 0) return left;
  const merged = new Uint8Array(left.length + right.length);
  merged.set(left, 0);
  merged.set(right, left.length);
  return merged;
};

const readFrameLength = (buffer: Uint8Array): number => {
  return (
    buffer[0] * 0x1000000 + buffer[1] * 0x10000 + buffer[2] * 0x100 + buffer[3]
  );
};

const encodeFrame = (payload: Uint8Array): Uint8Array => {
  const length = payload.length;
  const frame = new Uint8Array(FRAME_HEADER_BYTES + length);
  frame[0] = (length >>> 24) & 0xff;
  frame[1] = (length >>> 16) & 0xff;
  frame[2] = (length >>> 8) & 0xff;
  frame[3] = length & 0xff;
  frame.set(payload, FRAME_HEADER_BYTES);
  return frame;
};

const coerceChunk = (chunk: unknown): Uint8Array => {
  if (chunk instanceof Uint8Array) return chunk;
  if (chunk instanceof ArrayBuffer) return new Uint8Array(chunk);
  if (ArrayBuffer.isView(chunk)) {
    return new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
  }
  return new Uint8Array();
};

const createFrameParser = (
  onFrame: (payload: Uint8Array) => void,
): ((chunk: Uint8Array) => void) => {
  let buffer = new Uint8Array();

  return (chunk) => {
    if (chunk.length === 0) return;
    buffer = concatBuffers(buffer, chunk);

    while (buffer.length >= FRAME_HEADER_BYTES) {
      const length = readFrameLength(buffer);
      if (length > MAX_FRAME_SIZE) {
        throw new Error(`Sync frame too large: ${length} bytes`);
      }
      if (buffer.length < FRAME_HEADER_BYTES + length) {
        return;
      }
      const payload = buffer.slice(
        FRAME_HEADER_BYTES,
        FRAME_HEADER_BYTES + length,
      );
      buffer = buffer.slice(FRAME_HEADER_BYTES + length);
      onFrame(payload);
    }
  };
};

class LocalNetworkSyncService {
  private zeroconf: ZeroconfLike;
  private server: TcpServerLike | null = null;
  private tcpSocket: TcpSocketModule;
  private isAdvertising = false;
  private isScanning = false;
  private syncHandler: SyncRequestHandler | null = null;

  constructor() {
    this.zeroconf = createZeroconf();
    this.tcpSocket = createTcpSocket();
    this.setupListeners();
  }

  private setupListeners() {
    this.zeroconf.on("resolved", (service) => {
      logger.info("Discovered peer", { service });

      const deviceId = service.txt?.deviceId || service.name || "";
      if (!deviceId) return;

      const localDeviceId = useSyncStore.getState().localDeviceId;
      if (localDeviceId && deviceId === localDeviceId) {
        return;
      }

      const deviceInfo: DeviceInfo = {
        deviceId,
        deviceName: service.txt?.deviceName || service.name || "Unknown Device",
        lastSeen: new Date().toISOString(),
        ipAddress: selectAddress(service.addresses),
        port: service.port,
      };

      useSyncStore.getState().addPeer(deviceInfo);
    });

    this.zeroconf.on("remove", (service) => {
      logger.info("Peer left network", { service });
      const deviceId = service.txt?.deviceId || service.name;
      if (deviceId) {
        useSyncStore.getState().removePeer(deviceId);
      }
    });

    this.zeroconf.on("error", (error) => {
      logger.error("Zeroconf error", {}, error);
    });
  }

  /**
   * Start advertising this device on the local network.
   */
  async startAdvertising(): Promise<void> {
    if (this.isAdvertising) return;

    try {
      const deviceId = resolveDeviceId();
      const deviceName = resolveDeviceName(deviceId);

      await this.startTCPServer();

      this.zeroconf.publishService(
        SERVICE_TYPE,
        "tcp",
        SERVICE_DOMAIN,
        deviceName,
        DEFAULT_PORT,
        { deviceId, deviceName },
      );

      this.isAdvertising = true;
      logger.info("Started advertising device", { deviceId, deviceName });
    } catch (error) {
      logger.error("Failed to start advertising", {}, error);
      throw error;
    }
  }

  /**
   * Stop advertising.
   */
  stopAdvertising(): void {
    if (!this.isAdvertising) return;

    this.zeroconf.unpublishService(SERVICE_TYPE, "tcp");
    this.stopTCPServer();
    this.isAdvertising = false;
    logger.info("Stopped advertising");
  }

  /**
   * Scan for other devices on the network.
   */
  startScanning(): void {
    if (this.isScanning) return;

    useSyncStore.getState().setStatus("discovering");
    this.zeroconf.scan(SERVICE_TYPE, "tcp", SERVICE_DOMAIN);
    this.isScanning = true;
    logger.info("Started scanning for peers");
  }

  /**
   * Stop scanning.
   */
  stopScanning(): void {
    if (!this.isScanning) return;

    this.zeroconf.stop();
    this.isScanning = false;
    useSyncStore.getState().setStatus("idle");
    logger.info("Stopped scanning");
  }

  /**
   * Register a handler for incoming sync requests.
   */
  setSyncHandler(handler: SyncRequestHandler): void {
    this.syncHandler = handler;
  }

  /**
   * Connect and sync with a discovered peer.
   */
  async syncWithPeer(
    peer: DeviceInfo,
    syncData: Uint8Array,
  ): Promise<Uint8Array> {
    logger.info("Syncing with peer", {
      peerId: peer.deviceId,
      payloadSize: syncData.length,
    });

    if (!peer.ipAddress || !peer.port) {
      throw new Error("Peer connection info missing for local network sync.");
    }

    const socket = this.tcpSocket.connect(
      { host: peer.ipAddress, port: peer.port },
      () => {
        socket.write(encodeFrame(syncData));
      },
    );

    return new Promise((resolve, reject) => {
      let settled = false;
      const parser = createFrameParser((payload) => {
        if (settled) return;
        settled = true;
        resolve(payload);
        socket.destroy();
      });

      socket.on("data", (data) => {
        try {
          parser(coerceChunk(data));
        } catch (error) {
          if (!settled) {
            settled = true;
            reject(error);
          }
          socket.destroy();
        }
      });

      socket.on("error", (error) => {
        if (!settled) {
          settled = true;
          reject(error);
        }
        socket.destroy();
      });

      socket.on("close", () => {
        if (!settled) {
          settled = true;
          reject(new Error("Connection closed before sync response."));
        }
      });
    });
  }

  private async startTCPServer(): Promise<void> {
    if (this.server) return;
    const server = this.tcpSocket.createServer((socket) => {
      const parser = createFrameParser((payload) => {
        void this.handleSyncRequest(socket, payload);
      });

      socket.on("data", (data) => {
        try {
          parser(coerceChunk(data));
        } catch (error) {
          logger.error("Failed to parse sync payload", {}, error);
          socket.destroy();
        }
      });

      socket.on("error", (error) => {
        logger.error("TCP socket error", {}, error);
      });
    });

    server.listen({ port: DEFAULT_PORT, host: "0.0.0.0" }, () => {
      logger.info("TCP server listening", { port: DEFAULT_PORT });
    });

    this.server = server;
  }

  private stopTCPServer(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }

  private async handleSyncRequest(
    socket: TcpSocketLike,
    payload: Uint8Array,
  ): Promise<void> {
    if (!this.syncHandler) {
      logger.error("No sync handler registered for incoming request");
      socket.destroy();
      return;
    }

    try {
      const response = await this.syncHandler(payload);
      socket.write(encodeFrame(response));
    } catch (error) {
      logger.error("Failed to handle sync request", {}, error);
      socket.destroy();
    }
  }
}

export const localNetworkSync = new LocalNetworkSyncService();
