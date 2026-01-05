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
const AUTH_HEADER_BYTES = 2;
const MAX_FRAME_SIZE = 10 * 1024 * 1024;
const MAX_AUTH_TOKEN_BYTES = 256;
const DEFAULT_BIND_ADDRESS = "127.0.0.1";
const DEFAULT_SYNC_TIMEOUT_MS = 10000;
const DEFAULT_MAX_CONCURRENT_CONNECTIONS = 8;
const DEFAULT_MAX_CONNECTIONS_PER_IP = 4;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 10000;
const DEFAULT_RATE_LIMIT_MAX = 20;

type ByteArray = Uint8Array<ArrayBufferLike>;

type ZeroconfTxtRecord = Record<string, string | undefined>;

type ZeroconfService = {
  name?: string;
  txt?: ZeroconfTxtRecord;
  addresses?: string[];
  port?: number;
};

interface ZeroconfLike {
  on(event: "resolved", handler: (service: ZeroconfService) => void): void;
  on(event: "remove", handler: (service: ZeroconfService) => void): void;
  on(event: "error", handler: (error: unknown) => void): void;
  off?: (
    event: "resolved" | "remove" | "error",
    handler: (arg: unknown) => void,
  ) => void;
  removeListener?: (
    event: "resolved" | "remove" | "error",
    handler: (arg: unknown) => void,
  ) => void;
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
}

type ZeroconfConstructor = {
  new (): ZeroconfLike;
};

type TcpSocketLike = {
  on: (
    event: "data" | "error" | "close" | "timeout",
    handler: (data: unknown) => void,
  ) => void;
  off?: (
    event: "data" | "error" | "close" | "timeout",
    handler: (data: unknown) => void,
  ) => void;
  removeListener?: (
    event: "data" | "error" | "close" | "timeout",
    handler: (data: unknown) => void,
  ) => void;
  setTimeout?: (timeout: number) => void;
  write: (data: Uint8Array) => void;
  destroy: () => void;
  remoteAddress?: string;
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
  const deviceId = useSyncStore.getState().localDeviceId?.trim() ?? "";
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

const encodeString = (value: string): Uint8Array => {
  const Encoder = globalThis.TextEncoder as
    | (new () => { encode: (input?: string) => Uint8Array })
    | undefined;
  if (Encoder) {
    return new Encoder().encode(value);
  }
  throw new Error("TextEncoder unavailable: cannot encode UTF-8 characters.");
};

const decodeString = (value: Uint8Array): string => {
  const Decoder = globalThis.TextDecoder as
    | (new () => { decode: (input?: Uint8Array) => string })
    | undefined;
  if (Decoder) {
    return new Decoder().decode(value);
  }
  throw new Error("TextDecoder unavailable: cannot decode UTF-8 characters.");
};

const concatBuffers = (left: ByteArray, right: ByteArray): ByteArray => {
  if (left.length === 0) return right;
  if (right.length === 0) return left;
  const merged = new Uint8Array(left.length + right.length) as ByteArray;
  merged.set(left, 0);
  merged.set(right, left.length);
  return merged;
};

const readFrameLength = (buffer: ByteArray): number => {
  return (
    buffer[0] * 0x1000000 + buffer[1] * 0x10000 + buffer[2] * 0x100 + buffer[3]
  );
};

const encodeFrame = (payload: ByteArray): ByteArray => {
  const length = payload.length;
  const frame = new Uint8Array(FRAME_HEADER_BYTES + length) as ByteArray;
  frame[0] = (length >>> 24) & 0xff;
  frame[1] = (length >>> 16) & 0xff;
  frame[2] = (length >>> 8) & 0xff;
  frame[3] = length & 0xff;
  frame.set(payload, FRAME_HEADER_BYTES);
  return frame;
};

const coerceChunk = (chunk: unknown): ByteArray => {
  if (chunk instanceof Uint8Array) return chunk as ByteArray;
  if (chunk instanceof ArrayBuffer) return new Uint8Array(chunk) as ByteArray;
  if (ArrayBuffer.isView(chunk)) {
    return new Uint8Array(
      chunk.buffer,
      chunk.byteOffset,
      chunk.byteLength,
    ) as ByteArray;
  }
  return new Uint8Array() as ByteArray;
};

const encodeAuthenticatedPayload = (
  payload: Uint8Array,
  token: string,
): ByteArray => {
  const tokenBytes = encodeString(token);
  if (tokenBytes.length === 0) {
    throw new Error("Auth token required.");
  }
  if (tokenBytes.length > MAX_AUTH_TOKEN_BYTES) {
    throw new Error("Auth token too long.");
  }

  const framed = new Uint8Array(
    AUTH_HEADER_BYTES + tokenBytes.length + payload.length,
  ) as ByteArray;
  framed[0] = (tokenBytes.length >>> 8) & 0xff;
  framed[1] = tokenBytes.length & 0xff;
  framed.set(tokenBytes, AUTH_HEADER_BYTES);
  framed.set(payload, AUTH_HEADER_BYTES + tokenBytes.length);
  return framed;
};

const decodeAuthenticatedPayload = (
  payload: Uint8Array,
): { token: string; payload: ByteArray } => {
  if (payload.length < AUTH_HEADER_BYTES) {
    throw new Error("Missing authentication header.");
  }
  const tokenLength = payload[0] * 0x100 + payload[1];
  if (tokenLength <= 0 || tokenLength > MAX_AUTH_TOKEN_BYTES) {
    throw new Error("Invalid authentication token length.");
  }
  if (payload.length < AUTH_HEADER_BYTES + tokenLength) {
    throw new Error("Malformed authentication header.");
  }
  const tokenBytes = payload.slice(
    AUTH_HEADER_BYTES,
    AUTH_HEADER_BYTES + tokenLength,
  );
  const innerPayload = payload.slice(AUTH_HEADER_BYTES + tokenLength);
  if (innerPayload.length === 0) {
    throw new Error("Missing sync payload.");
  }
  return {
    token: decodeString(tokenBytes),
    payload: innerPayload,
  };
};

const createFrameParser = (
  onFrame: (payload: ByteArray) => void,
): ((chunk: ByteArray) => void) => {
  let buffer = new Uint8Array() as ByteArray;

  return (chunk) => {
    if (chunk.length === 0) return;
    buffer = concatBuffers(buffer, chunk);

    while (buffer.length >= FRAME_HEADER_BYTES) {
      const length = readFrameLength(buffer);
      if (length === 0) {
        throw new Error("Sync frame missing payload.");
      }
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
  private listenersAttached = false;
  private bindAddress = DEFAULT_BIND_ADDRESS;
  private syncTimeoutMs = DEFAULT_SYNC_TIMEOUT_MS;
  private maxConcurrentConnections = DEFAULT_MAX_CONCURRENT_CONNECTIONS;
  private maxConnectionsPerIp = DEFAULT_MAX_CONNECTIONS_PER_IP;
  private rateLimitWindowMs = DEFAULT_RATE_LIMIT_WINDOW_MS;
  private rateLimitMaxConnections = DEFAULT_RATE_LIMIT_MAX;
  private authToken: string | null = null;
  private outgoingTokenResolver: ((peer: DeviceInfo) => string) | null = null;
  private activeSockets = new Set<TcpSocketLike>();
  private socketHandlers = new Map<
    TcpSocketLike,
    {
      data: (data: unknown) => void;
      error: (data: unknown) => void;
      close: (data: unknown) => void;
      timeout: (data: unknown) => void;
    }
  >();
  private serverSockets = new Map<TcpSocketLike, string>();
  private activeConnectionsByIp = new Map<string, number>();
  private connectionRate = new Map<
    string,
    { count: number; resetAt: number }
  >();

  constructor() {
    this.zeroconf = createZeroconf();
    this.tcpSocket = createTcpSocket();
    this.ensureListeners();
  }

  private handleResolved = (service: ZeroconfService) => {
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
  };

  private handleRemove = (service: ZeroconfService) => {
    logger.info("Peer left network", { service });
    const deviceId = service.txt?.deviceId || service.name;
    if (deviceId) {
      useSyncStore.getState().removePeer(deviceId);
    }
  };

  private handleError = (error: unknown) => {
    logger.error("Zeroconf error", {}, error);
  };

  private setupListeners() {
    this.zeroconf.on("resolved", this.handleResolved);
    this.zeroconf.on("remove", this.handleRemove);
    this.zeroconf.on("error", this.handleError);
    this.listenersAttached = true;
  }

  private ensureListeners() {
    if (this.listenersAttached) return;
    this.setupListeners();
  }

  configure(options: {
    bindAddress?: string;
    syncTimeoutMs?: number;
    maxConcurrentConnections?: number;
    maxConnectionsPerIp?: number;
    rateLimit?: { windowMs: number; maxConnections: number };
    authToken?: string;
    outgoingTokenResolver?: (peer: DeviceInfo) => string;
  }): void {
    if (options.bindAddress) {
      this.bindAddress = options.bindAddress;
    }
    if (options.syncTimeoutMs) {
      this.syncTimeoutMs = Math.max(1000, options.syncTimeoutMs);
    }
    if (options.maxConcurrentConnections) {
      this.maxConcurrentConnections = Math.max(
        1,
        options.maxConcurrentConnections,
      );
    }
    if (options.maxConnectionsPerIp) {
      this.maxConnectionsPerIp = Math.max(1, options.maxConnectionsPerIp);
    }
    if (options.rateLimit) {
      this.rateLimitWindowMs = Math.max(1000, options.rateLimit.windowMs);
      this.rateLimitMaxConnections = Math.max(
        1,
        options.rateLimit.maxConnections,
      );
    }
    if (options.authToken !== undefined) {
      this.authToken = options.authToken.trim() || null;
    }
    if (options.outgoingTokenResolver) {
      this.outgoingTokenResolver = options.outgoingTokenResolver;
    }
  }

  dispose(): void {
    this.stopAdvertising();
    this.stopScanning();
    this.detachZeroconfListeners();
    this.cleanupAllSockets();
    this.connectionRate.clear();
    this.activeConnectionsByIp.clear();
    this.listenersAttached = false;
  }

  private detachZeroconfListener(
    event: "resolved" | "remove" | "error",
    handler: ((service: ZeroconfService) => void) | ((error: unknown) => void),
  ): void {
    const listener = handler as (arg: unknown) => void;
    if (this.zeroconf.removeListener) {
      this.zeroconf.removeListener(event, listener);
      return;
    }
    if (this.zeroconf.off) {
      this.zeroconf.off(event, listener);
    }
  }

  private detachZeroconfListeners(): void {
    if (!this.listenersAttached) return;
    this.detachZeroconfListener("resolved", this.handleResolved);
    this.detachZeroconfListener("remove", this.handleRemove);
    this.detachZeroconfListener("error", this.handleError);
  }

  private detachSocketListener(
    socket: TcpSocketLike,
    event: "data" | "error" | "close" | "timeout",
    handler: (data: unknown) => void,
  ): void {
    if (socket.removeListener) {
      socket.removeListener(event, handler);
      return;
    }
    if (socket.off) {
      socket.off(event, handler);
    }
  }

  private resolveIncomingToken(): string {
    if (this.authToken) return this.authToken;
    const deviceId = resolveDeviceId();
    this.authToken = deviceId;
    return deviceId;
  }

  private resolveOutgoingToken(peer: DeviceInfo): string {
    if (this.outgoingTokenResolver) {
      const token = this.outgoingTokenResolver(peer).trim();
      if (!token) {
        throw new Error("Outgoing auth token missing.");
      }
      return token;
    }
    return peer.deviceId;
  }

  private canAcceptConnection(remoteAddress: string): boolean {
    if (this.serverSockets.size >= this.maxConcurrentConnections) {
      logger.warn("Too many concurrent sync connections", {
        remoteAddress,
      });
      return false;
    }

    const activeForIp = this.activeConnectionsByIp.get(remoteAddress) || 0;
    if (activeForIp >= this.maxConnectionsPerIp) {
      logger.warn("Too many concurrent connections for peer", {
        remoteAddress,
      });
      return false;
    }

    const now = Date.now();
    const entry = this.connectionRate.get(remoteAddress) || {
      count: 0,
      resetAt: now + this.rateLimitWindowMs,
    };
    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + this.rateLimitWindowMs;
    }
    if (entry.count >= this.rateLimitMaxConnections) {
      logger.warn("Rate limit exceeded for peer", { remoteAddress });
      this.connectionRate.set(remoteAddress, entry);
      return false;
    }
    entry.count += 1;
    this.connectionRate.set(remoteAddress, entry);
    return true;
  }

  private trackServerSocket(
    socket: TcpSocketLike,
    remoteAddress: string,
  ): void {
    this.activeSockets.add(socket);
    this.serverSockets.set(socket, remoteAddress);
    const current = this.activeConnectionsByIp.get(remoteAddress) || 0;
    this.activeConnectionsByIp.set(remoteAddress, current + 1);
  }

  private untrackServerSocket(socket: TcpSocketLike): void {
    const remoteAddress = this.serverSockets.get(socket);
    this.activeSockets.delete(socket);
    this.serverSockets.delete(socket);
    if (remoteAddress) {
      const current = this.activeConnectionsByIp.get(remoteAddress) || 0;
      if (current <= 1) {
        this.activeConnectionsByIp.delete(remoteAddress);
      } else {
        this.activeConnectionsByIp.set(remoteAddress, current - 1);
      }
    }
  }

  private trackClientSocket(socket: TcpSocketLike): void {
    this.activeSockets.add(socket);
  }

  private untrackClientSocket(socket: TcpSocketLike): void {
    this.activeSockets.delete(socket);
  }

  private cleanupAllSockets(): void {
    this.socketHandlers.forEach((handlers, socket) => {
      this.detachSocketListener(socket, "data", handlers.data);
      this.detachSocketListener(socket, "error", handlers.error);
      this.detachSocketListener(socket, "close", handlers.close);
      this.detachSocketListener(socket, "timeout", handlers.timeout);
      socket.destroy();
    });
    this.socketHandlers.clear();
    this.activeSockets.clear();
    this.serverSockets.clear();
  }

  private cleanupServerSockets(): void {
    const sockets = Array.from(this.serverSockets.keys());
    sockets.forEach((socket) => {
      const handlers = this.socketHandlers.get(socket);
      if (handlers) {
        this.detachSocketListener(socket, "data", handlers.data);
        this.detachSocketListener(socket, "error", handlers.error);
        this.detachSocketListener(socket, "close", handlers.close);
        this.detachSocketListener(socket, "timeout", handlers.timeout);
        this.socketHandlers.delete(socket);
      }
      socket.destroy();
      this.untrackServerSocket(socket);
    });
  }

  /**
   * Start advertising this device on the local network.
   */
  async startAdvertising(): Promise<void> {
    if (this.isAdvertising) return;

    try {
      this.ensureListeners();
      const deviceId = resolveDeviceId();
      const deviceName = resolveDeviceName(deviceId);
      if (!this.authToken) {
        this.authToken = deviceId;
      }

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

    this.ensureListeners();
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

    const outgoingToken = this.resolveOutgoingToken(peer);
    const outgoingPayload = encodeAuthenticatedPayload(syncData, outgoingToken);
    const socket = this.tcpSocket.connect(
      { host: peer.ipAddress, port: peer.port },
      () => {
        socket.write(encodeFrame(outgoingPayload));
      },
    );
    this.trackClientSocket(socket);

    return new Promise((resolve, reject) => {
      let settled = false;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const finish = (outcome: { payload?: Uint8Array; error?: unknown }) => {
        if (settled) return;
        settled = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        this.detachSocketListener(socket, "data", handleData);
        this.detachSocketListener(socket, "error", handleError);
        this.detachSocketListener(socket, "close", handleClose);
        this.detachSocketListener(socket, "timeout", handleTimeoutEvent);
        this.untrackClientSocket(socket);
        this.socketHandlers.delete(socket);
        socket.destroy();
        if (outcome.error) {
          const error =
            outcome.error instanceof Error
              ? outcome.error
              : new Error("Sync socket error.");
          reject(error);
          return;
        }
        if (!outcome.payload) {
          reject(new Error("Missing sync response payload."));
          return;
        }
        resolve(outcome.payload);
      };

      const handleTimeout = () => {
        finish({ error: new Error("Sync request timed out.") });
      };

      const parser = createFrameParser((payload) => {
        try {
          const response = decodeAuthenticatedPayload(payload);
          if (response.token !== outgoingToken) {
            throw new Error("Invalid auth token in sync response.");
          }
          finish({ payload: response.payload });
        } catch (error) {
          finish({ error });
        }
      });

      const handleData = (data: unknown) => {
        try {
          parser(coerceChunk(data));
        } catch (error) {
          finish({ error });
        }
      };

      const handleError = (error: unknown) => {
        finish({ error });
      };

      const handleClose = (_event: unknown) => {
        finish({ error: new Error("Connection closed before sync response.") });
      };

      const handleTimeoutEvent = (_event: unknown) => {
        handleTimeout();
      };

      socket.on("data", handleData);
      socket.on("error", handleError);
      socket.on("close", handleClose);
      socket.on("timeout", handleTimeoutEvent);
      this.socketHandlers.set(socket, {
        data: handleData,
        error: handleError,
        close: handleClose,
        timeout: handleTimeoutEvent,
      });

      timeoutId = setTimeout(handleTimeout, this.syncTimeoutMs);
      if (socket.setTimeout) {
        socket.setTimeout(this.syncTimeoutMs);
      }
    });
  }

  private async startTCPServer(): Promise<void> {
    if (this.server) return;
    const server = this.tcpSocket.createServer((socket) => {
      const remoteAddress = socket.remoteAddress || "unknown";
      if (!this.canAcceptConnection(remoteAddress)) {
        socket.destroy();
        return;
      }
      this.trackServerSocket(socket, remoteAddress);

      const parser = createFrameParser((payload) => {
        void this.handleSyncRequest(socket, payload);
      });

      const cleanup = () => {
        this.detachSocketListener(socket, "data", handleData);
        this.detachSocketListener(socket, "error", handleError);
        this.detachSocketListener(socket, "close", handleClose);
        this.detachSocketListener(socket, "timeout", handleTimeout);
        this.untrackServerSocket(socket);
        this.socketHandlers.delete(socket);
      };

      const handleData = (data: unknown) => {
        try {
          parser(coerceChunk(data));
        } catch (error) {
          logger.error("Failed to parse sync payload", {}, error);
          socket.destroy();
          cleanup();
        }
      };

      const handleError = (error: unknown) => {
        logger.error("TCP socket error", {}, error);
        cleanup();
      };

      const handleClose = (_event: unknown) => {
        cleanup();
      };

      const handleTimeout = (_event: unknown) => {
        logger.warn("TCP socket timed out", { remoteAddress });
        socket.destroy();
        cleanup();
      };

      socket.on("data", handleData);
      socket.on("error", handleError);
      socket.on("close", handleClose);
      socket.on("timeout", handleTimeout);
      this.socketHandlers.set(socket, {
        data: handleData,
        error: handleError,
        close: handleClose,
        timeout: handleTimeout,
      });

      if (socket.setTimeout) {
        socket.setTimeout(this.syncTimeoutMs);
      }
    });

    server.listen({ port: DEFAULT_PORT, host: this.bindAddress }, () => {
      logger.info("TCP server listening", {
        port: DEFAULT_PORT,
        host: this.bindAddress,
      });
    });

    this.server = server;
  }

  private stopTCPServer(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    this.cleanupServerSockets();
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
      const decoded = decodeAuthenticatedPayload(payload);
      const expectedToken = this.resolveIncomingToken();
      if (decoded.token !== expectedToken) {
        logger.warn("Rejected sync request with invalid auth token");
        socket.destroy();
        return;
      }
      const response = await this.syncHandler(decoded.payload);
      const responsePayload = encodeAuthenticatedPayload(
        response,
        decoded.token,
      );
      socket.write(encodeFrame(responsePayload));
    } catch (error) {
      logger.error("Failed to handle sync request", {}, error);
      socket.destroy();
    }
  }
}

export const localNetworkSync = new LocalNetworkSyncService();
