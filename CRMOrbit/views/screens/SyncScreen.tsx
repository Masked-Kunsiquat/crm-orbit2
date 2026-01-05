import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  CameraView,
  type BarcodeScanningResult,
  useCameraPermissions,
} from "expo-camera";
import QRCode from "qrcode";
import Svg, { Path, Rect } from "react-native-svg";

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
import { __internal_updateCrmDoc, useDoc } from "@views/store/store";
import { t } from "@i18n/index";

type QrPayloadViewProps = {
  payload: string;
  size?: number;
  darkColor: string;
  lightColor: string;
};

const QrPayloadView = ({
  payload,
  size = 220,
  darkColor,
  lightColor,
}: QrPayloadViewProps) => {
  const qr = useMemo(
    () => QRCode.create(payload, { errorCorrectionLevel: "L" }),
    [payload],
  );
  const moduleCount = qr.modules.size;
  const moduleData = qr.modules.data as ArrayLike<number | boolean>;
  const path = useMemo(() => {
    const commands: string[] = [];
    for (let row = 0; row < moduleCount; row += 1) {
      for (let col = 0; col < moduleCount; col += 1) {
        const index = row * moduleCount + col;
        if (!moduleData[index]) continue;
        commands.push(`M${col} ${row}h1v1h-1z`);
      }
    }
    return commands.join("");
  }, [moduleCount, moduleData]);

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${moduleCount} ${moduleCount}`}
    >
      <Rect
        x="0"
        y="0"
        width={moduleCount}
        height={moduleCount}
        fill={lightColor}
      />
      <Path d={path} fill={darkColor} />
    </Svg>
  );
};

export const SyncScreen = () => {
  const { colors } = useTheme();
  const { dialogProps, showAlert, showDialog } = useConfirmDialog();
  const deviceId = useDeviceId();
  const doc = useDoc();
  const { discoveredPeers, status, currentMethod, lastSyncTimestamp } =
    useSyncStore();
  const [qrBatch, setQrBatch] = useState<SyncQRCodeBatch | null>(null);
  const [qrProgress, setQrProgress] = useState<{
    received: number;
    total: number;
  } | null>(null);
  const [qrIndex, setQrIndex] = useState(0);
  const [showQrPreview, setShowQrPreview] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
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
        if (Platform.OS === "android" && Platform.Version >= 33) {
          const permission = PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES;
          const granted = await PermissionsAndroid.check(permission);
          if (!granted) {
            const result = await PermissionsAndroid.request(permission, {
              title: t("sync.permissions.nearbyWifiTitle"),
              message: t("sync.permissions.nearbyWifiMessage"),
              buttonPositive: t("common.ok"),
            });
            if (isActive && result !== PermissionsAndroid.RESULTS.GRANTED) {
              showDialog({
                title: t("common.error"),
                message: t("sync.permissions.nearbyWifiDenied"),
                confirmLabel: t("sync.permissions.openSettings"),
                cancelLabel: t("common.cancel"),
                onConfirm: () => {
                  void Linking.openSettings();
                },
              });
              return;
            }
          }
        }
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
  }, [showDialog]);

  useEffect(() => {
    if (!showQRScanner) return;
    const ensurePermission = async () => {
      if (permission?.granted) return;
      await requestPermission();
    };

    void ensurePermission();
  }, [showQRScanner, permission?.granted, requestPermission]);

  const updateSyncedDoc = (updatedDoc: typeof doc) => {
    __internal_updateCrmDoc(updatedDoc);
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
      setQrIndex(0);
      setShowQrPreview(false);
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

  const handleBarCodeScanned = ({ data }: BarcodeScanningResult) => {
    if (scanBusy) return;
    void handleQRScanned(data);
  };

  const handleShowQrPreview = () => {
    if (!qrBatch) return;
    setQrIndex(0);
    setShowQrPreview(true);
  };

  const handleHideQrPreview = () => {
    setShowQrPreview(false);
  };

  const handleNextQr = () => {
    if (!qrBatch) return;
    setQrIndex((current) => Math.min(current + 1, qrBatch.chunks.length - 1));
  };

  const handlePreviousQr = () => {
    setQrIndex((current) => Math.max(0, current - 1));
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
            <Text
              style={[
                styles.statusValue,
                styles.deviceIdValue,
                { color: colors.textPrimary },
              ]}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
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
              <View style={styles.qrHeader}>
                <Text style={[styles.qrHint, { color: colors.textSecondary }]}>
                  {showQrPreview
                    ? t("sync.manual.qrPrompt")
                    : t("sync.manual.qrReady")}
                </Text>
                <ActionButton
                  label={
                    showQrPreview
                      ? t("sync.manual.qrHide")
                      : t("sync.manual.qrShow")
                  }
                  onPress={
                    showQrPreview ? handleHideQrPreview : handleShowQrPreview
                  }
                  tone="link"
                  size="compact"
                />
              </View>
              {showQrPreview ? (
                <View style={styles.qrPreview}>
                  <Text
                    style={[styles.qrLabel, { color: colors.textSecondary }]}
                  >
                    {t("sync.manual.qrChunk", {
                      index: qrIndex + 1,
                      total: qrBatch.chunks.length,
                    })}
                  </Text>
                  <QrPayloadView
                    payload={qrBatch.chunks[qrIndex]?.payload ?? ""}
                    darkColor={colors.textPrimary}
                    lightColor={colors.canvas}
                  />
                  {qrBatch.chunks.length > 1 ? (
                    <View style={styles.qrNav}>
                      <ActionButton
                        label={t("sync.manual.qrPrevious")}
                        onPress={handlePreviousQr}
                        size="compact"
                        disabled={qrIndex === 0}
                      />
                      <Text
                        style={[
                          styles.qrCounter,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {t("sync.manual.qrCounter", {
                          index: qrIndex + 1,
                          total: qrBatch.chunks.length,
                        })}
                      </Text>
                      <ActionButton
                        label={t("sync.manual.qrNext")}
                        onPress={handleNextQr}
                        size="compact"
                        disabled={qrIndex === qrBatch.chunks.length - 1}
                      />
                    </View>
                  ) : null}
                </View>
              ) : null}
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

          {!permission ? (
            <View style={styles.scannerStatus}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text
                style={[styles.scannerHint, { color: colors.textSecondary }]}
              >
                {t("sync.manual.scanHint")}
              </Text>
            </View>
          ) : null}

          {permission && !permission.granted ? (
            <View style={styles.scannerStatus}>
              <Text
                style={[styles.scannerHint, { color: colors.textSecondary }]}
              >
                {t("sync.permissions.cameraDenied")}
              </Text>
              <ActionButton
                label={t("sync.permissions.openSettings")}
                onPress={() => {
                  void Linking.openSettings();
                }}
                size="compact"
                tone="link"
              />
            </View>
          ) : null}

          {permission?.granted ? (
            <View style={styles.scannerBody}>
              <CameraView
                style={styles.scanner}
                onBarcodeScanned={scanBusy ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
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
  deviceIdValue: {
    flexShrink: 1,
    maxWidth: "60%",
    textAlign: "right",
  },
  emptyState: {
    paddingVertical: 12,
  },
  qrSection: {
    marginTop: 8,
  },
  qrHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  qrHint: {
    fontSize: 13,
    marginBottom: 8,
  },
  qrPreview: {
    alignItems: "center",
  },
  qrLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  qrNav: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  qrCounter: {
    fontSize: 12,
    fontWeight: "500",
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
