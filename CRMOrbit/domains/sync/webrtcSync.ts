import { createLogger } from "@utils/logger";

const logger = createLogger("WebRTCSync");

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

type EventTargetLike = {
  addEventListener: (type: string, listener: (event: unknown) => void) => void;
  removeEventListener: (
    type: string,
    listener: (event: unknown) => void,
  ) => void;
};

type DataChannelLike = {
  readyState: string;
  send: (data: Uint8Array) => void;
  close: () => void;
};

type PeerConnectionLike = {
  createDataChannel: (
    label: string,
    options: { ordered: boolean },
  ) => DataChannelLike;
  createOffer: () => Promise<unknown>;
  createAnswer: () => Promise<unknown>;
  setLocalDescription: (description: unknown) => Promise<void>;
  setRemoteDescription: (description: unknown) => Promise<void>;
  localDescription: unknown;
  iceGatheringState: string;
  close: () => void;
};

type WebRTCModule = {
  RTCPeerConnection: new (config: {
    iceServers: { urls: string }[];
  }) => PeerConnectionLike;
  RTCSessionDescription: new (description: unknown) => unknown;
};

let cachedWebRTCModule: WebRTCModule | null = null;

const loadWebRTCModule = (): WebRTCModule => {
  if (cachedWebRTCModule) {
    return cachedWebRTCModule;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require("react-native-webrtc") as WebRTCModule;
    cachedWebRTCModule = module;
    return module;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "WebRTC native module unavailable.";
    throw new Error(
      `WebRTC native module not found. Use a dev client to enable WebRTC sync. (${message})`,
    );
  }
};

const encodeString = (value: string): Uint8Array => {
  const Encoder = globalThis.TextEncoder;
  if (Encoder) {
    return new Encoder().encode(value);
  }
  throw new Error("TextEncoder unavailable: cannot encode UTF-8 characters.");
};

const toUint8Array = (data: unknown): Uint8Array => {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  if (typeof data === "string") {
    return encodeString(data);
  }
  return new Uint8Array();
};

class WebRTCPeerConnection {
  private peerConnection: PeerConnectionLike | null = null;
  private dataChannel: DataChannelLike | null = null;
  private onDataReceived?: (data: Uint8Array) => void;

  async createOffer(
    onDataCallback: (data: Uint8Array) => void,
  ): Promise<string> {
    this.onDataReceived = onDataCallback;

    const { RTCPeerConnection } = loadWebRTCModule();
    this.peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    this.dataChannel = this.peerConnection.createDataChannel("sync", {
      ordered: true,
    });

    this.setupDataChannel();
    this.setupIceCandidateHandler();

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    await this.waitForIceGatheringComplete();

    return JSON.stringify(this.peerConnection.localDescription);
  }

  async createAnswer(
    offerSDP: string,
    onDataCallback: (data: Uint8Array) => void,
  ): Promise<string> {
    this.onDataReceived = onDataCallback;

    const { RTCPeerConnection, RTCSessionDescription } = loadWebRTCModule();
    this.peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    this.setupDataChannelReceiver();
    this.setupIceCandidateHandler();

    const offer = new RTCSessionDescription(JSON.parse(offerSDP));
    await this.peerConnection.setRemoteDescription(offer);

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    await this.waitForIceGatheringComplete();

    return JSON.stringify(this.peerConnection.localDescription);
  }

  async acceptAnswer(answerSDP: string): Promise<void> {
    if (!this.peerConnection) {
      throw new Error("No peer connection");
    }

    const { RTCSessionDescription } = loadWebRTCModule();
    const answer = new RTCSessionDescription(JSON.parse(answerSDP));
    await this.peerConnection.setRemoteDescription(answer);

    logger.info("WebRTC connection established");
  }

  sendData(data: Uint8Array): void {
    if (!this.dataChannel || this.dataChannel.readyState !== "open") {
      throw new Error("Data channel not ready");
    }

    this.dataChannel.send(data);
    logger.info("Sent data via WebRTC", { size: data.length });
  }

  close(): void {
    if (this.dataChannel) {
      this.dataChannel.close();
    }
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    this.dataChannel = null;
    this.peerConnection = null;
    logger.info("Closed WebRTC connection");
  }

  private setupDataChannel(): void {
    if (!this.dataChannel) return;

    const channelEvents = this.dataChannel as unknown as EventTargetLike;

    channelEvents.addEventListener("open", () => {
      logger.info("Data channel opened");
    });

    channelEvents.addEventListener("message", (event: unknown) => {
      logger.info("Received data via WebRTC");
      if (this.onDataReceived) {
        const payload = event as { data?: unknown };
        this.onDataReceived(toUint8Array(payload.data));
      }
    });

    channelEvents.addEventListener("error", (error: unknown) => {
      logger.error("Data channel error", {}, error);
    });
  }

  private setupDataChannelReceiver(): void {
    if (!this.peerConnection) return;
    const peerConnection = this.peerConnection;
    const peerEvents = peerConnection as unknown as EventTargetLike;
    peerEvents.addEventListener("datachannel", (event: unknown) => {
      const dataEvent = event as {
        channel: DataChannelLike;
      };
      this.dataChannel = dataEvent.channel;
      this.setupDataChannel();
    });
  }

  private setupIceCandidateHandler(): void {
    if (!this.peerConnection) return;
    const peerConnection = this.peerConnection;
    const peerEvents = peerConnection as unknown as EventTargetLike;
    peerEvents.addEventListener("icecandidate", (event: unknown) => {
      const candidateEvent = event as { candidate?: unknown };
      if (candidateEvent.candidate) {
        logger.debug("ICE candidate", { candidate: candidateEvent.candidate });
      }
    });
  }

  private waitForIceGatheringComplete(timeoutMs: number = 5000): Promise<void> {
    if (!this.peerConnection) {
      return Promise.resolve();
    }

    const peerConnection = this.peerConnection;
    const peerEvents = peerConnection as unknown as EventTargetLike;

    return new Promise((resolve) => {
      if (peerConnection.iceGatheringState === "complete") {
        resolve();
        return;
      }

      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const handler = () => {
        if (peerConnection.iceGatheringState === "complete") {
          peerEvents.removeEventListener("icegatheringstatechange", handler);
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          resolve();
        }
      };

      peerEvents.addEventListener("icegatheringstatechange", handler);
      timeoutId = setTimeout(
        () => {
          peerEvents.removeEventListener("icegatheringstatechange", handler);
          resolve();
        },
        Math.max(0, timeoutMs),
      );
    });
  }
}

export const createWebRTCConnection = () => new WebRTCPeerConnection();
