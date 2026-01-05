import { useMemo } from "react";
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { Audit } from "@domains/audit";
import { t } from "@i18n/index";

import { useDeviceId, useTheme } from "../hooks";
import { useAuditActions } from "../hooks/useAuditActions";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import { ConfirmDialog } from "./ConfirmDialog";
import { Section } from "./Section";
import { StatusBadge } from "./StatusBadge";

type AuditsSectionProps = {
  audits: Audit[];
  accountId: string;
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
};

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
  accountId,
  navigation,
}: AuditsSectionProps) => {
  const { colors } = useTheme();
  const deviceId = useDeviceId();
  const { deleteAudit } = useAuditActions(deviceId);
  const { dialogProps, showDialog } = useConfirmDialog();

  const sortedAudits = useMemo(() => {
    return [...audits].sort((left, right) => {
      const leftTime = left.occurredAt ?? left.scheduledFor;
      const rightTime = right.occurredAt ?? right.scheduledFor;
      return new Date(rightTime).getTime() - new Date(leftTime).getTime();
    });
  }, [audits]);

  const handleDelete = (audit: Audit) => {
    showDialog({
      title: t("audits.deleteTitle"),
      message: t("audits.deleteConfirmation"),
      confirmLabel: t("common.delete"),
      confirmVariant: "danger",
      cancelLabel: t("common.cancel"),
      onConfirm: () => {
        deleteAudit(audit.id);
      },
    });
  };

  return (
    <Section>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t("audits.title")} ({audits.length})
        </Text>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.accent }]}
            onPress={() =>
              navigation.navigate("AuditForm", {
                accountId,
              })
            }
          >
            <Text style={[styles.addButtonText, { color: colors.onAccent }]}>
              {t("audits.addButton")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {sortedAudits.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {t("audits.emptyAccountAudits")}
        </Text>
      ) : (
        sortedAudits.map((audit) => {
          const isCompleted = Boolean(audit.occurredAt);
          const timestampLabel = isCompleted
            ? t("audits.fields.occurredAt")
            : t("audits.fields.scheduledFor");
          const timestampValue = formatTimestamp(
            audit.occurredAt ?? audit.scheduledFor,
          );
          const scoreLabel =
            audit.score !== undefined
              ? `${t("audits.fields.score")}: ${audit.score}`
              : null;
          const floorsLabel = formatFloors(audit.floorsVisited);
          return (
            <View
              key={audit.id}
              style={[styles.auditCard, { backgroundColor: colors.surfaceElevated }]}
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
                      style={[styles.auditTimestamp, { color: colors.textPrimary }]}
                    >
                      {timestampLabel}: {timestampValue}
                    </Text>
                    <StatusBadge
                      isActive={isCompleted}
                      activeLabelKey="audits.status.completed"
                      inactiveLabelKey="audits.status.scheduled"
                    />
                  </View>
                  {scoreLabel ? (
                    <Text style={[styles.auditMeta, { color: colors.textSecondary }]}>
                      {scoreLabel}
                    </Text>
                  ) : null}
                  {floorsLabel ? (
                    <Text style={[styles.auditMeta, { color: colors.textSecondary }]}>
                      {t("audits.fields.floorsVisited")}: {floorsLabel}
                    </Text>
                  ) : null}
                  {audit.notes ? (
                    <Text
                      style={[styles.auditNotes, { color: colors.textSecondary }]}
                      numberOfLines={2}
                    >
                      {audit.notes}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
              <TouchableOpacity
                style={[styles.deleteButton, { backgroundColor: colors.errorBg }]}
                onPress={() => handleDelete(audit)}
              >
                <Text style={[styles.deleteButtonText, { color: colors.error }]}>
                  {t("audits.deleteButton")}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })
      )}

      {dialogProps ? <ConfirmDialog {...dialogProps} /> : null}
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
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: "600",
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
  deleteButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
