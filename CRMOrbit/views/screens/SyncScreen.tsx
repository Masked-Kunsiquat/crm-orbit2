import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  BarCodeScanner,
  type BarCodeScannerResult,
} from "expo-barcode-scanner";

import type { DeviceInfo } from "@domains/sync/types";
import type { SyncQRCodeBatch } from "@domains/sync/qrCodeSync";
import { syncOrchestrator } from "@domains/sync/syncOrchestrator";
import { useSyncStore } from "@domains/sync/syncState";
import {
  ActionButton,
  ConfirmDialog,
  ListEmptyState,
  ListRow,
  PrimaryActionButton,
  Section,
} from "@views/components";
import { useConfirmDialog } from "@views/hooks/useConfirmDialog";
import { useDeviceId, useTheme } from "@views/hooks";
import { __internal_getCrmStore, useDoc } from "@views/store/store";
import { t } from "@i18n/index";

type CameraPermissionState = "unknown" | "granted" | "denied";

export const SyncScreen = () => {
  const { colors } = useTheme();
  const { dialogProps, showAlert } = useConfirmDialog();
  const deviceId = useDeviceId();
  const doc = useDoc();
  const { discoveredPeers, status, currentMethod, lastSyncTimestamp } =
    useSyncStore();
  const [qrBatch, setQrBatch] = useState<SyncQRCodeBatch | null>(null);
  const [qrProgress, setQrProgress] = useState<{
    received: number;
    total: number;
  } | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [cameraPermission, setCameraPermission] =
    useState<CameraPermissionState>("unknown");
  const [scanBusy, setScanBusy] = useState(false);
  const [syncingPeerId, setSyncingPeerId] = useState<string | null>(null);

  const peerList = useMemo(
    () =>
      Object.values(discoveredPeers).sort((left, right) =>
        left.deviceName.localeCompare(right.deviceName),
      ),
    [discoveredPeers],
  );

  const statusLabel = t(`sync.status.${status}`);
  const methodLabel = currentMethod
    ? t(`sync.method.${currentMethod}`)
    : t("common.unknown");
  const lastSyncLabel = lastSyncTimestamp
    ? new Date(lastSyncTimestamp).toLocaleString()
    : t("sync.lastSync.never");

  useEffect(() => {
    syncOrchestrator.initialize(doc, deviceId);
  }, [doc, deviceId]);

  useEffect(() => {
    let isActive = true;

    const startDiscovery = async () => {
      try {
        await syncOrchestrator.startAutoDiscovery();
      } catch (error) {
        if (!isActive) return;
        console.error("Failed to start auto discovery", error);
      }
    };

    void startDiscovery();

    return () => {
      isActive = false;
      syncOrchestrator.stopAutoDiscovery();
    };
  }, []);

  useEffect(() => {
    if (!showQRScanner) return;
    let isActive = true;
    setCameraPermission("unknown");

    (async () => {
      const { status: permission } =
        await BarCodeScanner.requestPermissionsAsync();
      if (!isActive) return;
      setCameraPermission(permission === "granted" ? "granted" : "denied");
    })();

    return () => {
      isActive = false;
    };
  }, [showQRScanner]);

  const updateSyncedDoc = (updatedDoc: typeof doc) => {
    const store = __internal_getCrmStore().getState();
    store.setDoc(updatedDoc);
  };

  const handleSyncWithPeer = async (peer: DeviceInfo) => {
    if (syncingPeerId) return;
    if (!peer.ipAddress) {
      showAlert(
        t("common.error"),
        t("sync.errors.webrtcUnavailable"),
        t("common.ok"),
      );
      return;
    }

    setSyncingPeerId(peer.deviceId);
    try {
      const updatedDoc = await syncOrchestrator.syncWithPeer(peer);
      updateSyncedDoc(updatedDoc);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("sync.errors.syncFailed");
      showAlert(t("common.error"), message, t("common.ok"));
    } finally {
      setSyncingPeerId(null);
    }
  };

  const handleGenerateQR = async () => {
    setQrProgress(null);
    try {
      const batch = await syncOrchestrator.generateManualSyncQR();
      setQrBatch(batch);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("sync.errors.qrGenerateFailed");
      showAlert(t("common.error"), message, t("common.ok"));
    }
  };

  const handleScanQR = () => {
    setQrProgress(null);
    setShowQRScanner(true);
  };

  const handleQRScanned = async (qrData: string) => {
    setScanBusy(true);
    try {
      const result = await syncOrchestrator.applyManualSyncQR(qrData);
      if (result.status === "pending") {
        setQrProgress({
          received: result.received,
          total: result.total,
        });
        setScanBusy(false);
        return;
      }

      updateSyncedDoc(result.doc);
      setQrProgress(null);
      setShowQRScanner(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("sync.errors.qrApplyFailed");
      showAlert(t("common.error"), message, t("common.ok"));
    } finally {
      setScanBusy(false);
    }
  };

  const handleBarCodeScanned = ({ data }: BarCodeScannerResult) => {
    if (scanBusy) return;
    void handleQRScanned(data);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Section title={t("sync.status.title")}>
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
              {t("sync.status.label")}
            </Text>
            <Text style={[styles.statusValue, { color: colors.textPrimary }]}>
              {statusLabel}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
              {t("sync.method.label")}
            </Text>
            <Text style={[styles.statusValue, { color: colors.textPrimary }]}>
              {methodLabel}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
              {t("sync.lastSync.label")}
            </Text>
            <Text style={[styles.statusValue, { color: colors.textPrimary }]}>
              {lastSyncLabel}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
              {t("sync.deviceId.label")}
            </Text>
            <Text style={[styles.statusValue, { color: colors.textPrimary }]}>
              {deviceId}
            </Text>
          </View>
        </Section>

        <Section title={t("sync.peers.title")}>
          {peerList.length === 0 ? (
            <ListEmptyState
              title={t("sync.peers.emptyTitle")}
              hint={t("sync.peers.emptyHint")}
              style={styles.emptyState}
            />
          ) : (
            peerList.map((peer) => (
              <ListRow
                key={peer.deviceId}
                title={peer.deviceName}
                subtitle={
                  peer.ipAddress ? peer.ipAddress : t("sync.peers.ipUnknown")
                }
                description={t("sync.peers.lastSeen", {
                  time: new Date(peer.lastSeen).toLocaleTimeString(),
                })}
                onPress={() => handleSyncWithPeer(peer)}
                titleAccessory={
                  syncingPeerId === peer.deviceId ? (
                    <ActivityIndicator size="small" color={colors.accent} />
                  ) : null
                }
              />
            ))
          )}
        </Section>

        <Section title={t("sync.manual.title")}>
          <PrimaryActionButton
            label={t("sync.manual.generate")}
            onPress={handleGenerateQR}
            size="block"
          />
          <PrimaryActionButton
            label={t("sync.manual.scan")}
            onPress={handleScanQR}
            size="block"
            stacked
          />

          {qrBatch ? (
            <View style={styles.qrSection}>
              <Text style={[styles.qrHint, { color: colors.textSecondary }]}>
                {t("sync.manual.qrPrompt")}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.qrScroll}
              >
                {qrBatch.chunks.map((chunk) => (
                  <View key={chunk.index} style={styles.qrCard}>
                    <Text
                      style={[styles.qrLabel, { color: colors.textSecondary }]}
                    >
                      {t("sync.manual.qrChunk", {
                        index: chunk.index,
                        total: chunk.total,
                      })}
                    </Text>
                    <Image
                      source={{ uri: chunk.dataUrl }}
                      style={styles.qrImage}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </Section>
      </ScrollView>

      <Modal
        visible={showQRScanner}
        animationType="slide"
        onRequestClose={() => setShowQRScanner(false)}
      >
        <View
          style={[styles.scannerContainer, { backgroundColor: colors.canvas }]}
        >
          <View style={styles.scannerHeader}>
            <Text style={[styles.scannerTitle, { color: colors.textPrimary }]}>
              {t("sync.manual.scan")}
            </Text>
            <ActionButton
              label={t("common.cancel")}
              onPress={() => setShowQRScanner(false)}
              tone="link"
              size="compact"
            />
          </View>

          {cameraPermission === "unknown" ? (
            <View style={styles.scannerStatus}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text
                style={[styles.scannerHint, { color: colors.textSecondary }]}
              >
                {t("sync.manual.scanHint")}
              </Text>
            </View>
          ) : null}

          {cameraPermission === "denied" ? (
            <View style={styles.scannerStatus}>
              <Text
                style={[styles.scannerHint, { color: colors.textSecondary }]}
              >
                {t("sync.permissions.cameraDenied")}
              </Text>
            </View>
          ) : null}

          {cameraPermission === "granted" ? (
            <View style={styles.scannerBody}>
              <BarCodeScanner
                style={styles.scanner}
                onBarCodeScanned={scanBusy ? undefined : handleBarCodeScanned}
                barCodeTypes={[BarCodeScanner.Constants.BarCodeType.qr]}
              />
              {scanBusy ? (
                <View style={styles.scannerOverlay}>
                  <ActivityIndicator size="large" color={colors.accent} />
                </View>
              ) : null}
            </View>
          ) : null}

          {qrProgress ? (
            <View style={styles.scanProgress}>
              <Text
                style={[styles.scanProgressText, { color: colors.textPrimary }]}
              >
                {t("sync.manual.scanProgress", {
                  received: qrProgress.received,
                  total: qrProgress.total,
                })}
              </Text>
            </View>
          ) : null}
        </View>
      </Modal>

      {dialogProps ? <ConfirmDialog {...dialogProps} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  statusValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyState: {
    paddingVertical: 12,
  },
  qrSection: {
    marginTop: 8,
  },
  qrHint: {
    fontSize: 13,
    marginBottom: 8,
  },
  qrScroll: {
    gap: 16,
  },
  qrCard: {
    alignItems: "center",
  },
  qrLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  qrImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
  },
  scannerContainer: {
    flex: 1,
    padding: 16,
  },
  scannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  scannerTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  scannerStatus: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scannerBody: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  scanner: {
    flex: 1,
  },
  scannerHint: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 12,
  },
  scannerOverlay: {
    position: "absolute",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  scanProgress: {
    marginTop: 16,
    alignItems: "center",
  },
  scanProgressText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
