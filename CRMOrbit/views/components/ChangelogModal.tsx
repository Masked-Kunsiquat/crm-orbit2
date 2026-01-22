import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { useTheme, useChangelog } from "../hooks";
import type { ChangelogCommit } from "../hooks";
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

export const ChangelogModal = ({ visible, onClose }: ChangelogModalProps) => {
  const { colors } = useTheme();
  const changelog = useChangelog();

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
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
            renderItem={({ item }) => <CommitItem item={item} />}
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
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },
});
