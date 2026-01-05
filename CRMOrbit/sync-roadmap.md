# Hybrid P2P Sync Implementation Roadmap

## Overview
Implement a three-tier sync strategy for CRM Orbit:
1. **Primary**: Local WiFi network discovery + direct sync
2. **Secondary**: WebRTC P2P for cross-network sync
3. **Fallback**: QR code manual sync

---

## Phase 1: Foundation & Core Sync Utilities

### 1.1 Install Dependencies

```bash
# Core sync dependencies
npm install react-native-zeroconf react-native-webrtc qrcode react-native-qrcode-scanner
npm install @react-native-async-storage/async-storage

# Expo compatibility
npx expo install expo-camera expo-barcode-scanner
```

### 1.2 Create Sync Domain Structure

**File: domains/sync/types.ts**
```typescript
import type { Timestamp } from '@domains/shared/types';
import type { AutomergeDoc } from '@automerge/schema';

export type DeviceInfo = {
  deviceId: string;
  deviceName: string;
  lastSeen: Timestamp;
  ipAddress?: string;
  port?: number;
};

export type SyncMethod = 'local-network' | 'webrtc' | 'qr-code' | 'manual';

export type SyncStatus =
  | 'idle'
  | 'discovering'
  | 'connecting'
  | 'syncing'
  | 'completed'
  | 'error';

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
  type: 'sync-request' | 'sync-response' | 'ping' | 'pong';
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
```

### 1.3 Create Sync State Manager

**File: domains/sync/syncState.ts**
```typescript
import { create } from 'zustand';
import type { DeviceInfo, SyncSession, SyncStatus } from './types';

interface SyncState {
  // Device management
  localDeviceId: string;
  discoveredPeers: Record<string, DeviceInfo>;

  // Sync sessions
  activeSessions: Record<string, SyncSession>;
  lastSyncTimestamp: string | null;

  // Status
  status: SyncStatus;
  currentMethod: SyncMethod | null;

  // Actions
  setStatus: (status: SyncStatus) => void;
  addPeer: (peer: DeviceInfo) => void;
  removePeer: (deviceId: string) => void;
  startSession: (session: SyncSession) => void;
  updateSession: (sessionId: string, updates: Partial<SyncSession>) => void;
  completeSession: (sessionId: string) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  localDeviceId: '', // Will be initialized from deviceId.ts
  discoveredPeers: {},
  activeSessions: {},
  lastSyncTimestamp: null,
  status: 'idle',
  currentMethod: null,

  setStatus: (status) => set({ status }),

  addPeer: (peer) => set((state) => ({
    discoveredPeers: { ...state.discoveredPeers, [peer.deviceId]: peer }
  })),

  removePeer: (deviceId) => set((state) => {
    const { [deviceId]: removed, ...rest } = state.discoveredPeers;
    return { discoveredPeers: rest };
  }),

  startSession: (session) => set((state) => ({
    activeSessions: { ...state.activeSessions, [session.id]: session },
    status: 'connecting',
    currentMethod: session.method
  })),

  updateSession: (sessionId, updates) => set((state) => ({
    activeSessions: {
      ...state.activeSessions,
      [sessionId]: { ...state.activeSessions[sessionId], ...updates }
    }
  })),

  completeSession: (sessionId) => set((state) => {
    const session = state.activeSessions[sessionId];
    return {
      lastSyncTimestamp: session.completedAt || new Date().toISOString(),
      status: 'completed',
      currentMethod: null
    };
  })
}));
```

### 1.4 Create Automerge Sync Utilities

**File: domains/sync/automergeSync.ts**
```typescript
import Automerge from 'automerge';
import type { AutomergeDoc } from '@automerge/schema';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLogger } from '@utils/logger';

const logger = createLogger('AutomergeSync');

const LAST_SYNC_VERSION_KEY = 'last_sync_version';

/**
 * Get changes since last sync with a peer
 */
export const getChangesSinceLastSync = async (
  currentDoc: AutomergeDoc,
  peerId: string
): Promise<Uint8Array> => {
  try {
    const lastSyncVersion = await AsyncStorage.getItem(
      `${LAST_SYNC_VERSION_KEY}_${peerId}`
    );

    if (!lastSyncVersion) {
      // First sync - send all changes
      logger.info('First sync with peer, sending all changes', { peerId });
      return Automerge.save(currentDoc);
    }

    // Get incremental changes
    const lastDoc = Automerge.load(
      new Uint8Array(JSON.parse(lastSyncVersion))
    );
    const changes = Automerge.getChanges(lastDoc, currentDoc);

    logger.info('Generated changes for sync', {
      peerId,
      changeCount: changes.length
    });

    return Automerge.encodeChange(changes[0]); // TODO: handle multiple changes
  } catch (error) {
    logger.error('Failed to get changes for sync', { peerId }, error);
    throw error;
  }
};

/**
 * Apply received changes to current document
 */
export const applyReceivedChanges = (
  currentDoc: AutomergeDoc,
  changes: Uint8Array
): AutomergeDoc => {
  try {
    const newDoc = Automerge.merge(
      currentDoc,
      Automerge.load(changes)
    );

    logger.info('Applied received changes');
    return newDoc;
  } catch (error) {
    logger.error('Failed to apply changes', {}, error);
    throw error;
  }
};

/**
 * Save sync checkpoint for a peer
 */
export const saveSyncCheckpoint = async (
  doc: AutomergeDoc,
  peerId: string
): Promise<void> => {
  try {
    const binary = Automerge.save(doc);
    await AsyncStorage.setItem(
      `${LAST_SYNC_VERSION_KEY}_${peerId}`,
      JSON.stringify(Array.from(binary))
    );

    logger.info('Saved sync checkpoint', { peerId });
  } catch (error) {
    logger.error('Failed to save sync checkpoint', { peerId }, error);
  }
};

/**
 * Create a sync bundle for QR code transfer
 */
export const createSyncBundle = async (
  currentDoc: AutomergeDoc,
  peerId: string = 'qr-transfer'
): Promise<string> => {
  const changes = await getChangesSinceLastSync(currentDoc, peerId);
  const base64 = Buffer.from(changes).toString('base64');

  // Compress if needed
  if (base64.length > 2000) {
    logger.warn('Sync bundle large, may need multiple QR codes', {
      size: base64.length
    });
  }

  return base64;
};

/**
 * Parse sync bundle from QR code
 */
export const parseSyncBundle = (qrData: string): Uint8Array => {
  return new Uint8Array(Buffer.from(qrData, 'base64'));
};
```

---

## Phase 2: Local Network Discovery & Sync

### 2.1 Create Local Network Service

**File: domains/sync/localNetworkSync.ts**
```typescript
import Zeroconf from 'react-native-zeroconf';
import { useSyncStore } from './syncState';
import { getDeviceId } from '@domains/persistence/deviceId';
import { createLogger } from '@utils/logger';
import type { DeviceInfo } from './types';

const logger = createLogger('LocalNetworkSync');

const SERVICE_TYPE = '_crmorbit._tcp';
const SERVICE_DOMAIN = 'local.';
const DEFAULT_PORT = 8765;

class LocalNetworkSyncService {
  private zeroconf: Zeroconf;
  private server: any; // TCP server instance
  private isAdvertising = false;
  private isScanning = false;

  constructor() {
    this.zeroconf = new Zeroconf();
    this.setupListeners();
  }

  private setupListeners() {
    this.zeroconf.on('resolved', (service) => {
      logger.info('Discovered peer', { service });

      const deviceInfo: DeviceInfo = {
        deviceId: service.txt?.deviceId || service.name,
        deviceName: service.txt?.deviceName || service.name,
        lastSeen: new Date().toISOString(),
        ipAddress: service.addresses?.[0],
        port: service.port
      };

      useSyncStore.getState().addPeer(deviceInfo);
    });

    this.zeroconf.on('remove', (service) => {
      logger.info('Peer left network', { service });
      const deviceId = service.txt?.deviceId || service.name;
      useSyncStore.getState().removePeer(deviceId);
    });

    this.zeroconf.on('error', (error) => {
      logger.error('Zeroconf error', {}, error);
    });
  }

  /**
   * Start advertising this device on the local network
   */
  async startAdvertising() {
    if (this.isAdvertising) return;

    try {
      const deviceId = await getDeviceId();
      const deviceName = await this.getDeviceName();

      // Start TCP server to receive connections
      await this.startTCPServer();

      // Advertise via mDNS/Bonjour
      this.zeroconf.publishService(
        SERVICE_TYPE,
        'tcp',
        SERVICE_DOMAIN,
        deviceName,
        DEFAULT_PORT,
        { deviceId, deviceName }
      );

      this.isAdvertising = true;
      logger.info('Started advertising device', { deviceId, deviceName });
    } catch (error) {
      logger.error('Failed to start advertising', {}, error);
      throw error;
    }
  }

  /**
   * Stop advertising
   */
  stopAdvertising() {
    if (!this.isAdvertising) return;

    this.zeroconf.unpublishService(SERVICE_TYPE, 'tcp');
    this.stopTCPServer();
    this.isAdvertising = false;
    logger.info('Stopped advertising');
  }

  /**
   * Scan for other devices on the network
   */
  startScanning() {
    if (this.isScanning) return;

    useSyncStore.getState().setStatus('discovering');
    this.zeroconf.scan(SERVICE_TYPE, 'tcp', SERVICE_DOMAIN);
    this.isScanning = true;
    logger.info('Started scanning for peers');
  }

  /**
   * Stop scanning
   */
  stopScanning() {
    if (!this.isScanning) return;

    this.zeroconf.stop();
    this.isScanning = false;
    useSyncStore.getState().setStatus('idle');
    logger.info('Stopped scanning');
  }

  /**
   * Connect and sync with a discovered peer
   */
  async syncWithPeer(peer: DeviceInfo, syncData: Uint8Array): Promise<Uint8Array> {
    // TODO: Implement TCP socket connection
    // This will send syncData and receive response
    logger.info('Syncing with peer', { peer });
    throw new Error('Not implemented yet');
  }

  private async getDeviceName(): Promise<string> {
    // TODO: Get from device settings or use default
    return 'CRM Orbit Device';
  }

  private async startTCPServer() {
    // TODO: Implement TCP server using react-native-tcp-socket
    logger.info('Starting TCP server on port', { port: DEFAULT_PORT });
  }

  private stopTCPServer() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}

export const localNetworkSync = new LocalNetworkSyncService();
```

---

## Phase 3: WebRTC P2P Sync

### 3.1 Create WebRTC Sync Service

**File: domains/sync/webrtcSync.ts**
```typescript
import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription } from 'react-native-webrtc';
import { createLogger } from '@utils/logger';
import type { DeviceInfo } from './types';

const logger = createLogger('WebRTCSync');

// Free public STUN servers
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

class WebRTCPeerConnection {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: any = null;
  private onDataReceived?: (data: Uint8Array) => void;

  async createOffer(onDataCallback: (data: Uint8Array) => void): Promise<string> {
    this.onDataReceived = onDataCallback;

    this.peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Create data channel for sending sync data
    this.dataChannel = this.peerConnection.createDataChannel('sync', {
      ordered: true
    });

    this.setupDataChannel();
    this.setupIceCandidateHandler();

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    // Wait for ICE gathering to complete
    await this.waitForIceGatheringComplete();

    // Return offer as JSON string (can be encoded in QR)
    return JSON.stringify(this.peerConnection.localDescription);
  }

  async createAnswer(offerSDP: string, onDataCallback: (data: Uint8Array) => void): Promise<string> {
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
    if (!this.peerConnection) throw new Error('No peer connection');

    const answer = new RTCSessionDescription(JSON.parse(answerSDP));
    await this.peerConnection.setRemoteDescription(answer);

    logger.info('WebRTC connection established');
  }

  sendData(data: Uint8Array): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('Data channel not ready');
    }

    this.dataChannel.send(data);
    logger.info('Sent data via WebRTC', { size: data.length });
  }

  close(): void {
    if (this.dataChannel) {
      this.dataChannel.close();
    }
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    logger.info('Closed WebRTC connection');
  }

  private setupDataChannel() {
    this.dataChannel.onopen = () => {
      logger.info('Data channel opened');
    };

    this.dataChannel.onmessage = (event: any) => {
      logger.info('Received data via WebRTC');
      if (this.onDataReceived) {
        this.onDataReceived(new Uint8Array(event.data));
      }
    };

    this.dataChannel.onerror = (error: any) => {
      logger.error('Data channel error', {}, error);
    };
  }

  private setupDataChannelReceiver() {
    this.peerConnection!.ondatachannel = (event: any) => {
      this.dataChannel = event.channel;
      this.setupDataChannel();
    };
  }

  private setupIceCandidateHandler() {
    this.peerConnection!.onicecandidate = (event: any) => {
      if (event.candidate) {
        logger.debug('ICE candidate:', event.candidate);
      }
    };
  }

  private waitForIceGatheringComplete(): Promise<void> {
    return new Promise((resolve) => {
      if (this.peerConnection!.iceGatheringState === 'complete') {
        resolve();
        return;
      }

      this.peerConnection!.onicegatheringstatechange = () => {
        if (this.peerConnection!.iceGatheringState === 'complete') {
          resolve();
        }
      };
    });
  }
}

export const createWebRTCConnection = () => new WebRTCPeerConnection();
```

---

## Phase 4: QR Code Manual Sync

### 4.1 Create QR Sync Service

**File: domains/sync/qrCodeSync.ts**
```typescript
import QRCode from 'qrcode';
import { createLogger } from '@utils/logger';
import { createSyncBundle, parseSyncBundle } from './automergeSync';
import type { AutomergeDoc } from '@automerge/schema';

const logger = createLogger('QRCodeSync');

const MAX_QR_SIZE = 2953; // Max bytes for QR code (version 40, error correction L)

/**
 * Generate QR code image for sync data
 */
export const generateSyncQRCode = async (
  doc: AutomergeDoc,
  peerId: string = 'manual-sync'
): Promise<string> => {
  try {
    const syncBundle = await createSyncBundle(doc, peerId);

    // Check if data fits in single QR code
    if (syncBundle.length > MAX_QR_SIZE) {
      logger.warn('Sync data too large for single QR code', {
        size: syncBundle.length,
        maxSize: MAX_QR_SIZE
      });
      // TODO: Implement chunking for large data
      throw new Error('Sync data too large. Use WiFi or WebRTC sync instead.');
    }

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(syncBundle, {
      errorCorrectionLevel: 'L',
      type: 'image/png',
      width: 512
    });

    logger.info('Generated sync QR code', { dataSize: syncBundle.length });
    return qrDataUrl;
  } catch (error) {
    logger.error('Failed to generate QR code', {}, error);
    throw error;
  }
};

/**
 * Parse sync data from scanned QR code
 */
export const parseSyncQRCode = (qrData: string): Uint8Array => {
  try {
    const changes = parseSyncBundle(qrData);
    logger.info('Parsed sync QR code', { size: changes.length });
    return changes;
  } catch (error) {
    logger.error('Failed to parse QR code', {}, error);
    throw error;
  }
};

/**
 * Generate WebRTC offer as QR code (for establishing P2P connection)
 */
export const generateWebRTCOfferQR = async (offerSDP: string): Promise<string> => {
  try {
    // Compress SDP if needed
    const qrDataUrl = await QRCode.toDataURL(offerSDP, {
      errorCorrectionLevel: 'M',
      width: 512
    });

    logger.info('Generated WebRTC offer QR code');
    return qrDataUrl;
  } catch (error) {
    logger.error('Failed to generate WebRTC offer QR', {}, error);
    throw error;
  }
};
```

---

## Phase 5: Orchestration & UI

### 5.1 Create Sync Orchestrator

**File: domains/sync/syncOrchestrator.ts**
```typescript
import { useSyncStore } from './syncState';
import { localNetworkSync } from './localNetworkSync';
import { createWebRTCConnection } from './webrtcSync';
import { getChangesSinceLastSync, applyReceivedChanges, saveSyncCheckpoint } from './automergeSync';
import { generateSyncQRCode, parseSyncQRCode } from './qrCodeSync';
import { createLogger } from '@utils/logger';
import type { AutomergeDoc } from '@automerge/schema';
import type { SyncMethod, DeviceInfo } from './types';

const logger = createLogger('SyncOrchestrator');

class SyncOrchestrator {
  private currentDoc: AutomergeDoc | null = null;

  /**
   * Initialize sync with current document
   */
  initialize(doc: AutomergeDoc) {
    this.currentDoc = doc;
    logger.info('Sync orchestrator initialized');
  }

  /**
   * Start discovering peers automatically
   */
  async startAutoDiscovery() {
    try {
      // Start both local network advertising and scanning
      await localNetworkSync.startAdvertising();
      localNetworkSync.startScanning();

      logger.info('Auto-discovery started');
    } catch (error) {
      logger.error('Failed to start auto-discovery', {}, error);
      throw error;
    }
  }

  /**
   * Stop auto-discovery
   */
  stopAutoDiscovery() {
    localNetworkSync.stopAdvertising();
    localNetworkSync.stopScanning();
    logger.info('Auto-discovery stopped');
  }

  /**
   * Sync with a specific peer using best available method
   */
  async syncWithPeer(peer: DeviceInfo): Promise<AutomergeDoc> {
    if (!this.currentDoc) throw new Error('Document not initialized');

    useSyncStore.getState().setStatus('connecting');

    try {
      // Try local network first
      if (peer.ipAddress) {
        logger.info('Attempting local network sync', { peer: peer.deviceId });
        return await this.syncViaLocalNetwork(peer);
      }

      // Fallback to WebRTC
      logger.info('Local network unavailable, using WebRTC', { peer: peer.deviceId });
      return await this.syncViaWebRTC(peer);
    } catch (error) {
      logger.error('Peer sync failed', { peer: peer.deviceId }, error);
      useSyncStore.getState().setStatus('error');
      throw error;
    }
  }

  /**
   * Sync via local network
   */
  private async syncViaLocalNetwork(peer: DeviceInfo): Promise<AutomergeDoc> {
    if (!this.currentDoc) throw new Error('Document not initialized');

    const changes = await getChangesSinceLastSync(this.currentDoc, peer.deviceId);
    const response = await localNetworkSync.syncWithPeer(peer, changes);

    const updatedDoc = applyReceivedChanges(this.currentDoc, response);
    await saveSyncCheckpoint(updatedDoc, peer.deviceId);

    this.currentDoc = updatedDoc;
    useSyncStore.getState().setStatus('completed');

    return updatedDoc;
  }

  /**
   * Sync via WebRTC (initiated by this device)
   */
  private async syncViaWebRTC(peer: DeviceInfo): Promise<AutomergeDoc> {
    if (!this.currentDoc) throw new Error('Document not initialized');

    const connection = createWebRTCConnection();

    // Create offer (will be shared via QR or other means)
    const offerSDP = await connection.createOffer(async (receivedData) => {
      const updatedDoc = applyReceivedChanges(this.currentDoc!, receivedData);
      await saveSyncCheckpoint(updatedDoc, peer.deviceId);
      this.currentDoc = updatedDoc;
    });

    // TODO: Share offerSDP with peer (via QR, clipboard, etc.)
    logger.info('WebRTC offer created, awaiting answer');

    // After answer is received and connection established
    const changes = await getChangesSinceLastSync(this.currentDoc, peer.deviceId);
    connection.sendData(changes);

    useSyncStore.getState().setStatus('completed');
    return this.currentDoc;
  }

  /**
   * Generate QR code for manual sync
   */
  async generateManualSyncQR(): Promise<string> {
    if (!this.currentDoc) throw new Error('Document not initialized');

    return await generateSyncQRCode(this.currentDoc);
  }

  /**
   * Apply changes from scanned QR code
   */
  async applyManualSyncQR(qrData: string): Promise<AutomergeDoc> {
    if (!this.currentDoc) throw new Error('Document not initialized');

    const changes = parseSyncQRCode(qrData);
    const updatedDoc = applyReceivedChanges(this.currentDoc, changes);

    this.currentDoc = updatedDoc;
    useSyncStore.getState().setStatus('completed');

    return updatedDoc;
  }
}

export const syncOrchestrator = new SyncOrchestrator();
```

### 5.2 Create Sync UI Screen

**File: views/screens/SyncScreen.tsx**
```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image } from 'react-native';
import { useSyncStore } from '@domains/sync/syncState';
import { syncOrchestrator } from '@domains/sync/syncOrchestrator';
import type { DeviceInfo } from '@domains/sync/types';

export const SyncScreen = () => {
  const {
    discoveredPeers,
    status,
    currentMethod,
    lastSyncTimestamp
  } = useSyncStore();

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);

  useEffect(() => {
    // Start auto-discovery when screen mounts
    syncOrchestrator.startAutoDiscovery();

    return () => {
      syncOrchestrator.stopAutoDiscovery();
    };
  }, []);

  const handleSyncWithPeer = async (peer: DeviceInfo) => {
    try {
      await syncOrchestrator.syncWithPeer(peer);
      // TODO: Update main app state with synced document
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const handleGenerateQR = async () => {
    const qr = await syncOrchestrator.generateManualSyncQR();
    setQrCode(qr);
  };

  const handleScanQR = () => {
    setShowQRScanner(true);
  };

  const handleQRScanned = async (qrData: string) => {
    try {
      await syncOrchestrator.applyManualSyncQR(qrData);
      setShowQRScanner(false);
      // TODO: Update main app state with synced document
    } catch (error) {
      console.error('QR sync failed:', error);
    }
  };

  const peerList = Object.values(discoveredPeers);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Device Sync</Text>

      {/* Status indicator */}
      <View style={styles.statusBox}>
        <Text>Status: {status}</Text>
        {currentMethod && <Text>Method: {currentMethod}</Text>}
        {lastSyncTimestamp && (
          <Text>Last sync: {new Date(lastSyncTimestamp).toLocaleString()}</Text>
        )}
      </View>

      {/* Discovered peers */}
      <Text style={styles.sectionTitle}>Nearby Devices ({peerList.length})</Text>
      {peerList.length === 0 ? (
        <Text style={styles.emptyText}>No devices found. Make sure both devices are on the same WiFi network.</Text>
      ) : (
        <FlatList
          data={peerList}
          keyExtractor={(item) => item.deviceId}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.peerItem}
              onPress={() => handleSyncWithPeer(item)}
            >
              <Text style={styles.peerName}>{item.deviceName}</Text>
              <Text style={styles.peerInfo}>
                {item.ipAddress || 'No IP'} • Last seen: {new Date(item.lastSeen).toLocaleTimeString()}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Manual sync options */}
      <View style={styles.manualSync}>
        <Text style={styles.sectionTitle}>Manual Sync</Text>

        <TouchableOpacity style={styles.button} onPress={handleGenerateQR}>
          <Text style={styles.buttonText}>Generate QR Code</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleScanQR}>
          <Text style={styles.buttonText}>Scan QR Code</Text>
        </TouchableOpacity>

        {qrCode && (
          <View style={styles.qrContainer}>
            <Text>Scan this QR code from your other device:</Text>
            <Image source={{ uri: qrCode }} style={styles.qrImage} />
          </View>
        )}
      </View>

      {/* TODO: Add QR scanner modal when showQRScanner is true */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statusBox: {
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontStyle: 'italic',
    color: '#666',
    marginVertical: 8,
  },
  peerItem: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  peerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  peerInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  manualSync: {
    marginTop: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  qrContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  qrImage: {
    width: 300,
    height: 300,
    marginTop: 8,
  },
});
```

---

## Phase 6: Background Sync & Images

### 6.1 Background Sync Task

**File: domains/sync/backgroundSync.ts**
```typescript
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { syncOrchestrator } from './syncOrchestrator';
import { createLogger } from '@utils/logger';

const logger = createLogger('BackgroundSync');

const BACKGROUND_SYNC_TASK = 'background-sync-task';

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    logger.info('Background sync task started');

    // TODO: Load current document from persistence
    // TODO: Attempt sync with known peers
    // TODO: Save updated document

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    logger.error('Background sync failed', {}, error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export const registerBackgroundSync = async () => {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 60 * 15, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });

    logger.info('Background sync registered');
  } catch (error) {
    logger.error('Failed to register background sync', {}, error);
  }
};

export const unregisterBackgroundSync = async () => {
  await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
  logger.info('Background sync unregistered');
};
```

### 6.2 Image Sync Strategy

**File: domains/sync/imageSync.ts**
```typescript
import * as FileSystem from 'expo-file-system/legacy';
import { createLogger } from '@utils/logger';
import type { ImageSyncManifest } from './types';

const logger = createLogger('ImageSync');

/**
 * Generate manifest of images to sync
 */
export const createImageManifest = async (): Promise<ImageSyncManifest> => {
  const orgLogosDir = `${FileSystem.documentDirectory}organization-logos/`;
  const contactLogosDir = `${FileSystem.documentDirectory}contact-logos/`;

  const manifest: ImageSyncManifest = {
    added: [],
    deleted: [],
    checksums: {},
  };

  // Scan directories and create checksums
  // TODO: Implement directory scanning and checksum generation

  return manifest;
};

/**
 * Sync images with peer
 */
export const syncImages = async (
  peerIpAddress: string,
  manifest: ImageSyncManifest
): Promise<void> => {
  // TODO: Implement image transfer via HTTP or local socket
  logger.info('Syncing images with peer', {
    peerIpAddress,
    imageCount: manifest.added.length
  });
};

/**
 * For QR sync: upload images to temporary cloud storage
 */
export const uploadImagesToCloud = async (uris: string[]): Promise<string[]> => {
  // TODO: Implement temporary cloud upload (e.g., Firebase Storage, S3)
  // Return array of cloud URLs
  logger.info('Uploading images to cloud', { count: uris.length });
  return [];
};

/**
 * Download images from cloud URLs
 */
export const downloadImagesFromCloud = async (urls: string[]): Promise<void> => {
  // TODO: Implement cloud download
  logger.info('Downloading images from cloud', { count: urls.length });
};
```

---

## Phase 7: Integration & Testing

### 7.1 Integration Checklist

```typescript
// File: index.ts - Main app initialization

import { syncOrchestrator } from '@domains/sync/syncOrchestrator';
import { registerBackgroundSync } from '@domains/sync/backgroundSync';

// In your app initialization:
export const initializeApp = async () => {
  // ... existing initialization

  // Initialize sync with current document
  const currentDoc = await loadDocumentFromPersistence();
  syncOrchestrator.initialize(currentDoc);

  // Register background sync
  await registerBackgroundSync();
};
```

### 7.2 Testing Scenarios

1. **Local Network Sync**
   - Connect both phones to same WiFi
   - Open sync screen on both devices
   - Verify peer discovery
   - Initiate sync from one device
   - Verify data appears on both

2. **WebRTC P2P Sync**
   - Put phones on different networks
   - Generate WebRTC offer on one device
   - Share via QR code or clipboard
   - Establish connection
   - Verify sync completes

3. **QR Manual Sync**
   - Make changes on Phone A
   - Generate QR code
   - Scan from Phone B
   - Verify changes applied
   - Generate response QR from Phone B
   - Scan on Phone A
   - Verify bidirectional sync

4. **Conflict Resolution**
   - Edit same contact on both phones while offline
   - Sync devices
   - Verify Automerge merges changes correctly

5. **Image Sync**
   - Add image to contact on Phone A
   - Sync with Phone B
   - Verify image appears on Phone B

---

## Timeline & Priorities

### Phase 1 (Foundation) - Week 1
- Core data structures and sync utilities
- Most critical for all other phases

### Phase 2 (Local Network) - Week 2
- Primary sync method
- Best user experience when on same network

### Phase 3 (WebRTC) - Week 3
- Secondary sync method
- Enables cross-network sync

### Phase 4 (QR Code) - Week 4
- Fallback method
- Simplest for testing

### Phase 5 (UI) - Week 5
- User-facing interface
- Polish and UX

### Phase 6 (Images & Background) - Week 6
- Image sync implementation
- Background sync automation

### Phase 7 (Testing) - Ongoing
- Test throughout development
- Final integration testing

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    CRM Orbit App                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐        ┌──────────────┐             │
│  │ Automerge    │◄──────►│ SQLite DB    │             │
│  │ Document     │        │ Event Log    │             │
│  └──────┬───────┘        └──────────────┘             │
│         │                                              │
│         │                                              │
│  ┌──────▼───────────────────────────────┐             │
│  │     Sync Orchestrator                │             │
│  │  - Manages sync sessions             │             │
│  │  - Chooses best method               │             │
│  │  - Tracks peer state                 │             │
│  └──────┬───────────────────────────────┘             │
│         │                                              │
│    ┌────┼────┬──────────────────┬──────────────┐      │
│    │    │    │                  │              │      │
│  ┌─▼────▼──┐ │ ┌──────────────┐ │ ┌──────────▼─────┐ │
│  │ Local   │ │ │   WebRTC     │ │ │  QR Code       │ │
│  │ Network │ │ │   P2P Sync   │ │ │  Manual Sync   │ │
│  │  Sync   │ │ │              │ │ │                │ │
│  │         │ │ │  - STUN      │ │ │  - Generate QR │ │
│  │ - mDNS  │ │ │  - Data Ch.  │ │ │  - Scan QR     │ │
│  │ - TCP   │ │ └──────────────┘ │ └────────────────┘ │
│  └─────────┘ │                  │                     │
│              │                  │                     │
│         Automatic          Cross-Network        Fallback
│         (Same WiFi)        (Any Network)       (Manual)
│                                                        │
└─────────────────────────────────────────────────────────┘

         │                    │                   │
         │                    │                   │
         ▼                    ▼                   ▼

┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Other       │    │  Other       │    │  Other       │
│  Device      │    │  Device      │    │  Device      │
│  (Same WiFi) │    │  (Anywhere)  │    │  (Manual)    │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## Key Design Decisions

1. **Why Automerge?**
   - Already in use in the app
   - Built-in conflict-free merging
   - Perfect for offline-first architecture
   - No external sync service needed

2. **Why Three-Tier Approach?**
   - Local network: Fast, low latency, no internet required
   - WebRTC: Works when devices on different networks
   - QR: Always works, no network dependencies, easy testing

3. **Why Not Syncthing Directly?**
   - No React Native/Expo support
   - File-based sync doesn't match SQLite architecture
   - Would require custom native modules
   - Maintained community forks uncertain

4. **Data Flow**
   - App state → Automerge doc → SQLite event log
   - Sync: Exchange Automerge changes (binary)
   - Merge: Automatic via Automerge CRDT
   - Persist: Save to SQLite after merge

---

## Next Steps

1. Install dependencies from Phase 1.1
2. Create sync domain structure - set up files and types
3. Implement Automerge sync utilities - core sync logic
4. Build local network discovery - get devices talking
5. Add QR fallback - for testing without network complexity
6. Integrate with existing app - connect to your store

## Notes

- Start with QR code sync for easiest testing
- Add local network discovery second
- WebRTC last (most complex)
- Test conflict resolution early and often
- Images can be synced separately from main data
