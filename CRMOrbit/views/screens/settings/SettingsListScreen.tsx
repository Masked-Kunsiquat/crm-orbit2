import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import type { MiscStackScreenProps } from "../../navigation/types";
import { ChangelogModal, ConfirmDialog, ListCard } from "../../components";
import {
  getAppVersion,
  useAppUpdates,
  useConfirmDialog,
  useDataWipe,
  useSettingsListLabels,
  useTheme,
} from "../../hooks";
import { useVersionLabels } from "../../hooks/useSettingsLabels";
import { t } from "@i18n/index";

type Props = MiscStackScreenProps<"SettingsList">;

export const SettingsListScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const labels = useSettingsListLabels();
  const versionLabels = useVersionLabels();
  const appVersion = getAppVersion();
  const [changelogVisible, setChangelogVisible] = useState(false);
  const {
    dialogProps: wipeDialogProps,
    showAlert,
    showDialog,
  } = useConfirmDialog();
  const { isWiping, requestWipe } = useDataWipe();
  const {
    status: updateStatus,
    isUpdateReady,
    checkForUpdate,
    applyUpdate,
    isEnabled: updatesEnabled,
    showUpdatePrompt,
    dismissUpdatePrompt,
  } = useAppUpdates({ checkOnMount: true, showAlertOnUpdate: true });

  const handleVersionPress = () => {
    if (isUpdateReady) {
      void applyUpdate();
    } else if (updateStatus !== "checking" && updateStatus !== "downloading") {
      void checkForUpdate();
    }
  };

  const handleSecurityPress = () => {
    navigation.navigate("SecuritySettings");
  };

  const handleCalendarPress = () => {
    navigation.navigate("CalendarSettings");
  };

  const handleAppearancePress = () => {
    navigation.navigate("AppearanceSettings");
  };

  const handleBackupPress = () => {
    navigation.navigate("BackupSettings");
  };

  const handleSyncPress = () => {
    navigation.navigate("Sync");
  };

  const handleWipePress = () => {
    if (isWiping) return;
    showDialog({
      title: t("settings.wipe.confirmTitle"),
      message: t("settings.wipe.confirmMessage"),
      confirmLabel: t("settings.wipe.confirmAction"),
      cancelLabel: t("common.cancel"),
      confirmVariant: "danger",
      onConfirm: () => {
        void (async () => {
          const outcome = await requestWipe();
          if (outcome.ok) {
            showAlert(
              t("settings.wipe.successTitle"),
              t("settings.wipe.successMessage"),
              t("common.ok"),
            );
          } else {
            showAlert(
              t("common.error"),
              outcome.error.message || t("settings.wipe.errorMessage"),
              t("common.ok"),
            );
          }
        })();
      },
    });
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={[styles.container, { backgroundColor: colors.canvas }]}
    >
      <ListCard onPress={handleAppearancePress}>
        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="palette"
              size={32}
              color={colors.accent}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {labels.appearanceTitle}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {labels.appearanceDescription}
            </Text>
          </View>
        </View>
      </ListCard>

      <ListCard onPress={handleBackupPress}>
        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="database"
              size={32}
              color={colors.accent}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {labels.backupTitle}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {labels.backupDescription}
            </Text>
          </View>
        </View>
      </ListCard>

      <ListCard onPress={isWiping ? undefined : handleWipePress}>
        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            {isWiping ? (
              <ActivityIndicator color={colors.error} size={32} />
            ) : (
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={32}
                color={colors.error}
              />
            )}
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {labels.wipeTitle}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {labels.wipeDescription}
            </Text>
          </View>
        </View>
      </ListCard>

      <ListCard onPress={handleCalendarPress}>
        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="calendar-sync"
              size={32}
              color={colors.accent}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {labels.calendarTitle}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {labels.calendarDescription}
            </Text>
          </View>
        </View>
      </ListCard>

      <ListCard onPress={handleSyncPress}>
        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="sync"
              size={32}
              color={colors.accent}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {labels.syncTitle}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {labels.syncDescription}
            </Text>
          </View>
        </View>
      </ListCard>

      <ListCard onPress={handleSecurityPress}>
        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="shield-lock-outline"
              size={32}
              color={colors.accent}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {labels.securityTitle}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {labels.securityDescription}
            </Text>
          </View>
        </View>
      </ListCard>

      {/* Version & Updates Section */}
      <View style={[styles.versionSection, { borderTopColor: colors.border }]}>
        <ListCard
          onLongPress={() => setChangelogVisible(true)}
          onPress={updatesEnabled ? handleVersionPress : undefined}
        >
          <View style={styles.cardContent}>
            <View style={styles.iconContainer}>
              {updateStatus === "checking" || updateStatus === "downloading" ? (
                <ActivityIndicator color={colors.accent} size={32} />
              ) : (
                <MaterialCommunityIcons
                  color={isUpdateReady ? colors.success : colors.accent}
                  name={isUpdateReady ? "download" : "information-outline"}
                  size={32}
                />
              )}
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {versionLabels.getVersionTitle(appVersion)}
              </Text>
              <Text
                style={[styles.description, { color: colors.textSecondary }]}
              >
                {updatesEnabled
                  ? versionLabels.getUpdateStatus(updateStatus, isUpdateReady)
                  : versionLabels.devBuild}
              </Text>
            </View>
          </View>
        </ListCard>
      </View>

      <ChangelogModal
        onClose={() => setChangelogVisible(false)}
        visible={changelogVisible}
      />

      <ConfirmDialog
        visible={showUpdatePrompt}
        title={t("settings.version.alertTitle")}
        message={t("settings.version.alertMessage")}
        confirmLabel={t("settings.version.alertRestart")}
        cancelLabel={t("settings.version.alertLater")}
        onConfirm={() => {
          dismissUpdatePrompt();
          void applyUpdate();
        }}
        onCancel={dismissUpdatePrompt}
      />

      {wipeDialogProps ? <ConfirmDialog {...wipeDialogProps} /> : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
  },
  versionSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
