import { useCallback } from "react";
import {
  FlatList,
  Linking,
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

const GITHUB_COMMIT_URL =
  "https://github.com/Masked-Kunsiquat/crm-orbit2/commit";

type ChangelogModalProps = {
  visible: boolean;
  onClose: () => void;
};

import type { ColorScheme } from "@domains/shared/theme/colors";

/**
 * Conventional commit type configuration with theme token keys
 */
type CommitTypeConfig = {
  label: string;
  bgToken: keyof ColorScheme;
  textToken: keyof ColorScheme;
};

const COMMIT_TYPES: Record<string, CommitTypeConfig> = {
  feat: {
    label: "feat",
    bgToken: "commitTypeFeatBg",
    textToken: "commitTypeFeatText",
  },
  fix: {
    label: "fix",
    bgToken: "commitTypeFixBg",
    textToken: "commitTypeFixText",
  },
  chore: {
    label: "chore",
    bgToken: "commitTypeChoreBg",
    textToken: "commitTypeChoreText",
  },
  docs: {
    label: "docs",
    bgToken: "commitTypeDocsBg",
    textToken: "commitTypeDocsText",
  },
  style: {
    label: "style",
    bgToken: "commitTypeStyleBg",
    textToken: "commitTypeStyleText",
  },
  refactor: {
    label: "refactor",
    bgToken: "commitTypeRefactorBg",
    textToken: "commitTypeRefactorText",
  },
  perf: {
    label: "perf",
    bgToken: "commitTypePerfBg",
    textToken: "commitTypePerfText",
  },
  test: {
    label: "test",
    bgToken: "commitTypeTestBg",
    textToken: "commitTypeTestText",
  },
  build: {
    label: "build",
    bgToken: "commitTypeBuildBg",
    textToken: "commitTypeBuildText",
  },
  ci: {
    label: "ci",
    bgToken: "commitTypeCiBg",
    textToken: "commitTypeCiText",
  },
};

/**
 * Parse a commit message to extract conventional commit type and scope
 */
const parseCommitMessage = (
  message: string,
): { type: string | null; scope: string | null; description: string } => {
  // Match conventional commit format: type(scope): description or type: description
  const match = message.match(/^(\w+)(?:\(([^)]+)\))?:\s*(.+)$/);

  if (match) {
    const [, type, scope, description] = match;
    const normalizedType = type.toLowerCase();
    if (COMMIT_TYPES[normalizedType]) {
      return { type: normalizedType, scope: scope || null, description };
    }
  }

  return { type: null, scope: null, description: message };
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

/**
 * Commit type badge component
 */
const CommitTypeBadge = ({ type }: { type: string }) => {
  const { colors } = useTheme();
  const config = COMMIT_TYPES[type];
  if (!config) return null;

  return (
    <View
      style={[styles.typeBadge, { backgroundColor: colors[config.bgToken] }]}
    >
      <Text style={[styles.typeBadgeText, { color: colors[config.textToken] }]}>
        {config.label}
      </Text>
    </View>
  );
};

/**
 * Scope badge component
 */
const ScopeBadge = ({ scope }: { scope: string }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.scopeBadge, { backgroundColor: colors.scopeBadgeBg }]}>
      <Text style={[styles.scopeBadgeText, { color: colors.scopeBadgeText }]}>
        {scope}
      </Text>
    </View>
  );
};

const CommitItem = ({
  item,
  isCurrentlyRunning,
  isFirst,
  isLast,
}: {
  item: ChangelogCommit;
  isCurrentlyRunning: boolean;
  isFirst: boolean;
  isLast: boolean;
}) => {
  const { colors } = useTheme();
  const parsed = parseCommitMessage(item.message);

  const handlePress = useCallback(() => {
    const url = `${GITHUB_COMMIT_URL}/${item.fullHash}`;
    Linking.openURL(url);
  }, [item.fullHash]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.itemContainer,
        pressed && { backgroundColor: colors.surfaceElevated },
      ]}
      accessibilityRole="link"
      accessibilityLabel={t("settings.changelog.commitAccessibility", {
        hash: item.hash,
        message: item.message,
      })}
    >
      {/* Timeline */}
      <View style={styles.timeline}>
        {/* Top line segment */}
        <View
          style={[
            styles.timelineSegment,
            { backgroundColor: isFirst ? "transparent" : colors.border },
          ]}
        />
        {/* Dot */}
        <View
          style={[
            styles.timelineDot,
            {
              backgroundColor: isCurrentlyRunning
                ? colors.success
                : colors.border,
              borderColor: isCurrentlyRunning ? colors.success : colors.border,
            },
          ]}
        >
          {isCurrentlyRunning && (
            <View
              style={[
                styles.timelineDotInner,
                { backgroundColor: colors.surface },
              ]}
            />
          )}
        </View>
        {/* Bottom line segment */}
        <View
          style={[
            styles.timelineSegment,
            { backgroundColor: isLast ? "transparent" : colors.border },
          ]}
        />
      </View>

      {/* Content */}
      <View style={styles.itemContent}>
        {/* Header row with date and hash */}
        <View style={styles.itemHeader}>
          <View style={styles.itemMetaRow}>
            <Text style={[styles.itemDate, { color: colors.textSecondary }]}>
              {item.date}
            </Text>
            <View
              style={[
                styles.hashBadge,
                { backgroundColor: colors.surfaceElevated },
              ]}
            >
              <Text style={[styles.itemHash, { color: colors.textMuted }]}>
                {item.hash}
              </Text>
            </View>
          </View>
          {/* Chevron indicator */}
          <MaterialCommunityIcons
            name="chevron-right"
            size={18}
            color={colors.chevron}
          />
        </View>

        {/* Currently running badge */}
        {isCurrentlyRunning && (
          <View
            style={[styles.currentBadge, { backgroundColor: colors.successBg }]}
          >
            <MaterialCommunityIcons
              name="check-circle"
              size={12}
              color={colors.success}
            />
            <Text style={[styles.currentBadgeText, { color: colors.success }]}>
              {t("settings.changelog.currentUpdate")}
            </Text>
          </View>
        )}

        {/* Message with type badges */}
        <View style={styles.messageContainer}>
          {parsed.type && <CommitTypeBadge type={parsed.type} />}
          {parsed.scope && <ScopeBadge scope={parsed.scope} />}
          <Text
            style={[styles.itemMessage, { color: colors.textPrimary }]}
            numberOfLines={3}
          >
            {parsed.description}
          </Text>
        </View>
      </View>
    </Pressable>
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
  const commitCount = changelog.commits.length;

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            { borderBottomColor: colors.border, paddingTop: insets.top + 12 },
          ]}
        >
          <View style={styles.headerContent}>
            <View
              style={[
                styles.headerIcon,
                { backgroundColor: colors.accentMuted },
              ]}
            >
              <MaterialCommunityIcons
                color={colors.accent}
                name="source-commit"
                size={20}
              />
            </View>
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {t("settings.changelog.title")}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {t("settings.changelog.version", {
                  version: changelog.version,
                })}
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityLabel={t("common.close")}
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              {
                backgroundColor: pressed
                  ? colors.surfaceElevated
                  : "transparent",
              },
            ]}
          >
            <MaterialCommunityIcons
              color={colors.textSecondary}
              name="close"
              size={24}
            />
          </Pressable>
        </View>

        {/* Version info bar */}
        <View
          style={[
            styles.versionBar,
            { backgroundColor: colors.surfaceElevated },
          ]}
        >
          <View style={styles.versionBarItem}>
            <MaterialCommunityIcons
              name="calendar-clock"
              size={14}
              color={colors.textMuted}
            />
            <Text
              style={[styles.versionBarText, { color: colors.textSecondary }]}
            >
              {t("settings.changelog.generatedAt", {
                date: new Date(changelog.generatedAt).toLocaleDateString(),
              })}
            </Text>
          </View>
          <View style={styles.versionBarItem}>
            <MaterialCommunityIcons
              name="source-commit"
              size={14}
              color={colors.textMuted}
            />
            <Text
              style={[styles.versionBarText, { color: colors.textSecondary }]}
            >
              {t("settings.changelog.commitCount", { count: commitCount })}
            </Text>
          </View>
        </View>

        {/* Commit list */}
        {commitCount > 0 ? (
          <FlatList
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 16 },
            ]}
            data={changelog.commits}
            keyExtractor={(item) => item.hash}
            renderItem={({ item, index }) => (
              <CommitItem
                isCurrentlyRunning={index === currentCommitIndex}
                isFirst={index === 0}
                isLast={index === commitCount - 1}
                item={item}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: colors.surfaceElevated },
              ]}
            >
              <MaterialCommunityIcons
                color={colors.textMuted}
                name="source-commit-end"
                size={40}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
              {t("settings.changelog.empty")}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              {t("settings.changelog.emptySubtitle")}
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
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 1,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
  },
  versionBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 20,
  },
  versionBarItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  versionBarText: {
    fontSize: 12,
    fontWeight: "500",
  },
  listContent: {
    paddingTop: 8,
    paddingHorizontal: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  itemContainer: {
    flexDirection: "row",
    paddingVertical: 4,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  timeline: {
    width: 24,
    alignItems: "center",
    marginRight: 12,
  },
  timelineSegment: {
    flex: 1,
    width: 2,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineDotInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  itemContent: {
    flex: 1,
    paddingVertical: 10,
    paddingRight: 8,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  itemMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemDate: {
    fontSize: 13,
    fontWeight: "500",
  },
  hashBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemHash: {
    fontSize: 11,
    fontFamily: "monospace",
    fontWeight: "500",
  },
  currentBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  messageContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  scopeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  scopeBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  itemMessage: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
    flexShrink: 1,
  },
});
