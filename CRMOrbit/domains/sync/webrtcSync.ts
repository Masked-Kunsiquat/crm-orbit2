import { RTCPeerConnection, RTCSessionDescription } from "react-native-webrtc";

import { createLogger } from "@utils/logger";

const logger = createLogger("WebRTCSync");

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const encodeString = (value: string): Uint8Array => {
  const Encoder = globalThis.TextEncoder;
  if (Encoder) {
    return new Encoder().encode(value);
  }
  const bytes = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i += 1) {
    bytes[i] = value.charCodeAt(i) & 0xff;
  }
  return bytes;
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
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: ReturnType<
    RTCPeerConnection["createDataChannel"]
  > | null = null;
  private onDataReceived?: (data: Uint8Array) => void;

  async createOffer(
    onDataCallback: (data: Uint8Array) => void,
  ): Promise<string> {
    this.onDataReceived = onDataCallback;

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

    this.dataChannel.onopen = () => {
      logger.info("Data channel opened");
    };

    this.dataChannel.onmessage = (event: { data: unknown }) => {
      logger.info("Received data via WebRTC");
      if (this.onDataReceived) {
        this.onDataReceived(toUint8Array(event.data));
      }
    };

    this.dataChannel.onerror = (error: unknown) => {
      logger.error("Data channel error", {}, error);
    };
  }

  private setupDataChannelReceiver(): void {
    if (!this.peerConnection) return;
    this.peerConnection.ondatachannel = (event: {
      channel: ReturnType<RTCPeerConnection["createDataChannel"]>;
    }) => {
      this.dataChannel = event.channel;
      this.setupDataChannel();
    };
  }

  private setupIceCandidateHandler(): void {
    if (!this.peerConnection) return;
    this.peerConnection.onicecandidate = (event: { candidate?: unknown }) => {
      if (event.candidate) {
        logger.debug("ICE candidate", { candidate: event.candidate });
      }
    };
  }

  private waitForIceGatheringComplete(): Promise<void> {
    if (!this.peerConnection) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      if (this.peerConnection?.iceGatheringState === "complete") {
        resolve();
        return;
      }

      this.peerConnection.onicegatheringstatechange = () => {
        if (this.peerConnection?.iceGatheringState === "complete") {
          resolve();
        }
      };
    });
  }
}

export const createWebRTCConnection = () => new WebRTCPeerConnection();
