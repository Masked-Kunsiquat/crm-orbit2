import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import * as Updates from "expo-updates";

import { useTheme, useChangelog } from "../hooks";
import type { ChangelogCommit } from "../hooks";
import { t } from "@i18n/index";

type ChangelogModalProps = {
  visible: boolean;
  onClose: () => void;
};

/**
 * Get the message from the currently running OTA update (if any).
 * Returns null in dev mode or if no update is running.
 */
const getCurrentUpdateMessage = (): string | null => {
  if (__DEV__ || !Updates.isEnabled || !Updates.updateId) {
    return null;
  }

  type ManifestWithMessage = {
    metadata?: { message?: string };
    extra?: { expoClient?: { extra?: { message?: string } } };
    message?: string;
  };

  const manifest = Updates.manifest as ManifestWithMessage | null;
  if (!manifest) return null;

  return (
    manifest.metadata?.message ??
    manifest.extra?.expoClient?.extra?.message ??
    manifest.message ??
    null
  );
};

const CommitItem = ({
  item,
  isCurrentlyRunning,
}: {
  item: ChangelogCommit;
  isCurrentlyRunning: boolean;
}) => {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.itemContainer, { borderBottomColor: colors.borderLight }]}
    >
      <View style={styles.itemHeader}>
        <View style={styles.itemDateRow}>
          <Text style={[styles.itemDate, { color: colors.textMuted }]}>
            {item.date}
          </Text>
          {isCurrentlyRunning ? (
            <View
              style={[styles.currentBadge, { backgroundColor: colors.success }]}
            >
              <Text
                style={[styles.currentBadgeText, { color: colors.onError }]}
              >
                {t("settings.changelog.currentUpdate")}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.itemId, { color: colors.textMuted }]}>
          {item.hash}
        </Text>
      </View>
      <Text style={[styles.itemMessage, { color: colors.textPrimary }]}>
        {item.message}
      </Text>
    </View>
  );
};

export const ChangelogModal = ({ visible, onClose }: ChangelogModalProps) => {
  const { colors } = useTheme();
  const changelog = useChangelog();
  const insets = useSafeAreaInsets();

  // Get the current update message to match against commits
  const currentUpdateMessage = getCurrentUpdateMessage();

  // Find which commit is currently running by matching the message
  const findCurrentCommitIndex = (): number => {
    if (!currentUpdateMessage) {
      // In dev mode or no update, don't highlight any commit
      return -1;
    }

    // Try to find a commit whose message matches the update message
    // The update message might be the full commit message or just the first line
    return changelog.commits.findIndex((commit) => {
      const commitFirstLine = commit.message.split("\n")[0].trim();
      const updateFirstLine = currentUpdateMessage.split("\n")[0].trim();
      return (
        commit.message === currentUpdateMessage ||
        commitFirstLine === updateFirstLine
      );
    });
  };

  const currentCommitIndex = findCurrentCommitIndex();

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <View
          style={[
            styles.header,
            { borderBottomColor: colors.border, paddingTop: insets.top + 12 },
          ]}
        >
          <View style={styles.headerContent}>
            <MaterialCommunityIcons
              color={colors.accent}
              name="history"
              size={24}
            />
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t("settings.changelog.title")}
            </Text>
          </View>
          <Pressable
            accessibilityLabel={t("common.close")}
            onPress={onClose}
            style={styles.closeButton}
          >
            <MaterialCommunityIcons
              color={colors.textSecondary}
              name="close"
              size={24}
            />
          </Pressable>
        </View>

        <View style={styles.versionInfo}>
          <Text style={[styles.versionLabel, { color: colors.textSecondary }]}>
            {t("settings.changelog.version", { version: changelog.version })}
          </Text>
          <Text style={[styles.generatedAt, { color: colors.textMuted }]}>
            {t("settings.changelog.generatedAt", {
              date: new Date(changelog.generatedAt).toLocaleDateString(),
            })}
          </Text>
        </View>

        {changelog.commits.length > 0 ? (
          <FlatList
            contentContainerStyle={styles.listContent}
            data={changelog.commits}
            keyExtractor={(item) => item.hash}
            renderItem={({ item, index }) => (
              <CommitItem
                isCurrentlyRunning={index === currentCommitIndex}
                item={item}
              />
            )}
          />
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              color={colors.textMuted}
              name="information-outline"
              size={48}
            />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t("settings.changelog.empty")}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  closeButton: {
    padding: 4,
  },
  versionInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  versionLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  generatedAt: {
    fontSize: 12,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  itemContainer: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemHeader: {
    marginBottom: 4,
  },
  itemDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  itemDate: {
    fontSize: 12,
  },
  itemId: {
    fontSize: 11,
    fontFamily: "monospace",
  },
  itemMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  currentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
});
