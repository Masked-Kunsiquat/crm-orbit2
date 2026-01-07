import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import type { Audit } from "@domains/audit";
import type { Account } from "@domains/account";
import { t } from "@i18n/index";

import { useTheme } from "../hooks";
import { Section } from "./Section";
import { StatusBadge } from "./StatusBadge";
import {
  getAuditStartTimestamp,
  getAuditStatusTone,
  getAuditTimestampLabelKey,
  formatAuditScore,
  resolveAuditStatus,
  sortAuditsByDescendingTime,
} from "../utils/audits";
import { getAuditScheduleStatus } from "../utils/auditSchedule";

type AuditsSectionProps = {
  audits: Audit[];
  account: Account;
  accountId: string;
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
};

const PREVIEW_LIMIT = 3;

const formatTimestamp = (timestamp?: string): string => {
  if (!timestamp) {
    return t("common.unknown");
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return t("common.unknown");
  }
  return date.toLocaleString();
};

const formatFloors = (floorsVisited?: number[]): string | null => {
  if (!floorsVisited || floorsVisited.length === 0) {
    return null;
  }
  return floorsVisited.join(", ");
};

export const AuditsSection = ({
  audits,
  account,
  accountId,
  navigation,
}: AuditsSectionProps) => {
  const { colors } = useTheme();
  const [showAllModal, setShowAllModal] = useState(false);

  const sortedAudits = useMemo(() => {
    return [...audits].sort(sortAuditsByDescendingTime);
  }, [audits]);
  const visibleAudits = sortedAudits.slice(0, PREVIEW_LIMIT);
  const hasMore = sortedAudits.length > PREVIEW_LIMIT;
  const scheduleStatus = useMemo(
    () => getAuditScheduleStatus(account, audits),
    [account, audits],
  );
  const warningLabelKey =
    scheduleStatus?.status === "due"
      ? "audits.due"
      : scheduleStatus?.status === "overdue"
        ? "audits.overdue"
        : scheduleStatus?.status === "missing"
          ? "audits.missing"
          : null;
  const warningTone =
    scheduleStatus?.status === "due"
      ? "warning"
      : scheduleStatus?.status === "overdue"
        ? "danger"
        : scheduleStatus?.status === "missing"
          ? "danger"
          : null;

  return (
    <Section>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t("audits.title")} ({audits.length})
          </Text>
          {warningLabelKey && warningTone ? (
            <StatusBadge tone={warningTone} labelKey={warningLabelKey} />
          ) : null}
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.iconButton,
              styles.iconButtonSecondary,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
            onPress={() =>
              navigation.navigate("AccountFloorsVisited", {
                accountId,
              })
            }
            accessibilityLabel={t("audits.fields.floorsVisited")}
          >
            <MaterialCommunityIcons
              name="stairs-up"
              size={18}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.accent }]}
            onPress={() =>
              navigation.navigate("AuditForm", {
                accountId,
              })
            }
            accessibilityLabel={t("audits.addButton")}
          >
            <MaterialCommunityIcons
              name="plus"
              size={18}
              color={colors.onAccent}
            />
          </TouchableOpacity>
        </View>
      </View>

      {sortedAudits.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {t("audits.emptyAccountAudits")}
        </Text>
      ) : (
        visibleAudits.map((audit) => {
          const status = resolveAuditStatus(audit);
          const timestampLabel = t(getAuditTimestampLabelKey(status));
          const timestampValue = formatTimestamp(getAuditStartTimestamp(audit));
          const scoreValue = formatAuditScore(audit.score);
          const scoreLabel = scoreValue
            ? `${t("audits.fields.score")}: ${scoreValue}`
            : null;
          const floorsLabel = formatFloors(audit.floorsVisited);
          return (
            <View
              key={audit.id}
              style={[
                styles.auditCard,
                { backgroundColor: colors.surfaceElevated },
              ]}
            >
              <Pressable
                style={styles.auditCardRow}
                onPress={() =>
                  navigation.navigate("AuditDetail", {
                    auditId: audit.id,
                  })
                }
              >
                <View style={styles.auditCardContent}>
                  <View style={styles.auditHeaderRow}>
                    <Text
                      style={[
                        styles.auditTimestamp,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {timestampLabel}: {timestampValue}
                    </Text>
                    <StatusBadge
                      tone={getAuditStatusTone(status)}
                      labelKey={status}
                    />
                  </View>
                  {scoreLabel ? (
                    <Text
                      style={[
                        styles.auditMeta,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {scoreLabel}
                    </Text>
                  ) : null}
                  {floorsLabel ? (
                    <Text
                      style={[
                        styles.auditMeta,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t("audits.fields.floorsVisited")}: {floorsLabel}
                    </Text>
                  ) : null}
                  {audit.notes ? (
                    <Text
                      style={[
                        styles.auditNotes,
                        { color: colors.textSecondary },
                      ]}
                      numberOfLines={2}
                    >
                      {audit.notes}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            </View>
          );
        })
      )}
      {hasMore ? (
        <TouchableOpacity
          style={[styles.viewAllButton, { borderColor: colors.border }]}
          onPress={() => setShowAllModal(true)}
        >
          <Text style={[styles.viewAllText, { color: colors.accent }]}>
            {t("common.viewAll")}
          </Text>
        </TouchableOpacity>
      ) : null}
      <Modal
        visible={showAllModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAllModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {t("audits.title")} ({sortedAudits.length})
              </Text>
              <TouchableOpacity
                onPress={() => setShowAllModal(false)}
                accessibilityLabel={t("common.cancel")}
              >
                <Text style={[styles.modalClose, { color: colors.accent }]}>
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={sortedAudits}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const status = resolveAuditStatus(item);
                const timestampLabel = t(getAuditTimestampLabelKey(status));
                const timestampValue = formatTimestamp(
                  getAuditStartTimestamp(item),
                );
                return (
                  <Pressable
                    style={[
                      styles.modalItem,
                      { borderBottomColor: colors.borderLight },
                    ]}
                    onPress={() => {
                      setShowAllModal(false);
                      navigation.navigate("AuditDetail", { auditId: item.id });
                    }}
                  >
                    <View style={styles.modalItemRow}>
                      <Text
                        style={[
                          styles.modalItemTitle,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {timestampLabel}: {timestampValue}
                      </Text>
                      <StatusBadge
                        tone={getAuditStatusTone(status)}
                        labelKey={status}
                      />
                    </View>
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </Section>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonSecondary: {
    borderWidth: 1,
    marginRight: 8,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  auditCard: {
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  auditCardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  auditCardContent: {
    flex: 1,
  },
  auditHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  auditTimestamp: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  auditMeta: {
    fontSize: 12,
    marginBottom: 2,
  },
  auditNotes: {
    fontSize: 13,
    marginTop: 4,
  },
  viewAllButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  modalContent: {
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: "70%",
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalClose: {
    fontSize: 13,
    fontWeight: "600",
  },
  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  modalItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
});
