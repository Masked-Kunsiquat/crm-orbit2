import { useMemo } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { NavigationProp } from "@react-navigation/native";

import type { Audit } from "@domains/audit";
import { t } from "@i18n/index";
import type { RootStackParamList } from "@views/navigation/types";

import { useTheme } from "../hooks";
import { Section } from "./Section";
import { StatusBadge } from "./StatusBadge";
import {
  getAuditStartTimestamp,
  getAuditStatusTone,
  resolveAuditStatus,
  sortAuditsByDescendingTime,
} from "../utils/audits";

type AuditsSectionProps = {
  audits: Audit[];
  accountId: string;
  navigation: NavigationProp<RootStackParamList>;
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

  const sortedAudits = useMemo(() => {
    return [...audits].sort(sortAuditsByDescendingTime);
  }, [audits]);

  return (
    <Section>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t("audits.title")} ({audits.length})
        </Text>
        <View style={styles.actionRow}>
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
        sortedAudits.map((audit) => {
          const status = resolveAuditStatus(audit);
          const timestampLabel =
            status === "audits.status.completed"
              ? t("audits.fields.occurredAt")
              : t("audits.fields.scheduledFor");
          const timestampValue = formatTimestamp(getAuditStartTimestamp(audit));
          const scoreLabel =
            audit.score !== undefined
              ? `${t("audits.fields.score")}: ${audit.score}`
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
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
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
});
