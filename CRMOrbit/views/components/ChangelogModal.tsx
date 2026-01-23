import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { useTheme, useChangelog, useUpdateHistory } from "../hooks";
import type { ChangelogCommit, UpdateHistoryEntry } from "../hooks";
import { t } from "@i18n/index";

type ChangelogModalProps = {
  visible: boolean;
  onClose: () => void;
};

const CommitItem = ({ item }: { item: ChangelogCommit }) => {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.commitItem, { borderBottomColor: colors.borderLight }]}
    >
      <View style={styles.commitHeader}>
        <Text style={[styles.commitHash, { color: colors.accent }]}>
          {item.hash}
        </Text>
        <Text style={[styles.commitDate, { color: colors.textMuted }]}>
          {item.date}
        </Text>
      </View>
      <Text style={[styles.commitMessage, { color: colors.textPrimary }]}>
        {item.message}
      </Text>
    </View>
  );
};

const UpdateItem = ({
  item,
  isCurrent,
}: {
  item: UpdateHistoryEntry;
  isCurrent: boolean;
}) => {
  const { colors } = useTheme();
  const receivedDate = new Date(item.receivedAt).toLocaleDateString();

  return (
    <View
      style={[styles.updateItem, { borderBottomColor: colors.borderLight }]}
    >
      <View style={styles.updateHeader}>
        <View style={styles.updateDateRow}>
          <Text style={[styles.updateDate, { color: colors.textMuted }]}>
            {receivedDate}
          </Text>
          {isCurrent ? (
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
        <Text style={[styles.updateId, { color: colors.textMuted }]}>
          {t("settings.changelog.updateId", {
            id: item.updateId.substring(0, 8),
          })}
        </Text>
      </View>
      <Text style={[styles.updateMessage, { color: colors.textPrimary }]}>
        {item.message ?? t("settings.changelog.noMessage")}
      </Text>
    </View>
  );
};

const SectionHeader = ({
  title,
  icon,
}: {
  title: string;
  icon: "cloud-download" | "source-commit";
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
      <MaterialCommunityIcons color={colors.accent} name={icon} size={18} />
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        {title}
      </Text>
    </View>
  );
};

export const ChangelogModal = ({ visible, onClose }: ChangelogModalProps) => {
  const { colors } = useTheme();
  const changelog = useChangelog();
  const { history, currentUpdate, isLoading } = useUpdateHistory();
  const insets = useSafeAreaInsets();

  const hasUpdates = history.length > 0;
  const hasCommits = changelog.commits.length > 0;

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

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollView}
        >
          {/* OTA Updates Section */}
          <SectionHeader
            icon="cloud-download"
            title={t("settings.changelog.updatesTitle")}
          />
          {isLoading ? (
            <View style={styles.emptySection}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Loading...
              </Text>
            </View>
          ) : hasUpdates ? (
            <View style={styles.listSection}>
              {history.map((item) => (
                <UpdateItem
                  isCurrent={currentUpdate?.updateId === item.updateId}
                  item={item}
                  key={item.updateId}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptySection}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {t("settings.changelog.updatesEmpty")}
              </Text>
            </View>
          )}

          {/* Git Commits Section */}
          <SectionHeader
            icon="source-commit"
            title={t("settings.changelog.commitsTitle")}
          />
          {hasCommits ? (
            <View style={styles.listSection}>
              {changelog.commits.map((item) => (
                <CommitItem item={item} key={item.hash} />
              ))}
            </View>
          ) : (
            <View style={styles.emptySection}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {t("settings.changelog.empty")}
              </Text>
            </View>
          )}
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  listSection: {
    paddingHorizontal: 16,
  },
  emptySection: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
  },
  commitItem: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  commitHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  commitHash: {
    fontSize: 12,
    fontFamily: "monospace",
    fontWeight: "600",
  },
  commitDate: {
    fontSize: 12,
  },
  commitMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  updateItem: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  updateHeader: {
    marginBottom: 4,
  },
  updateDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  updateDate: {
    fontSize: 12,
  },
  updateId: {
    fontSize: 11,
    fontFamily: "monospace",
  },
  updateMessage: {
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
