import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { t } from "@i18n/index";
import { useAudit, useAccount } from "../../store/store";
import { useAuditActions } from "../../hooks/useAuditActions";
import { useDeviceId } from "../../hooks";
import {
  ConfirmDialog,
  DangerActionButton,
  DetailField,
  DetailScreenLayout,
  PrimaryActionButton,
  Section,
  StatusBadge,
} from "../../components";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import { useTheme } from "../../hooks";
import {
  getAuditEndTimestamp,
  getAuditStartTimestamp,
  getAuditStatusTone,
  getAuditTimestampLabelKey,
  formatAuditScore,
  resolveAuditStatus,
} from "../../utils/audits";
import { formatDurationLabel } from "../../utils/duration";

type Props = {
  route: { params: { auditId: string } };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
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

export const AuditDetailScreen = ({ route, navigation }: Props) => {
  const { auditId } = route.params;
  const audit = useAudit(auditId);
  const account = useAccount(audit?.accountId ?? "");
  const deviceId = useDeviceId();
  const { deleteAudit } = useAuditActions(deviceId);
  const { colors } = useTheme();
  const { dialogProps, showDialog, showAlert } = useConfirmDialog();

  if (!audit) {
    return (
      <DetailScreenLayout>
        <Text style={[styles.errorText, { color: colors.error }]}>
          {t("audits.notFound")}
        </Text>
      </DetailScreenLayout>
    );
  }

  const handleEdit = () => {
    navigation.navigate("AuditForm", { auditId: audit.id });
  };

  const handleDelete = () => {
    showDialog({
      title: t("audits.deleteTitle"),
      message: t("audits.deleteConfirmation"),
      confirmLabel: t("common.delete"),
      confirmVariant: "danger",
      cancelLabel: t("common.cancel"),
      onConfirm: () => {
        const result = deleteAudit(audit.id);
        if (result.success) {
          navigation.goBack();
        } else {
          showAlert(
            t("common.error"),
            result.error ?? t("audits.deleteError"),
            t("common.ok"),
          );
        }
      },
    });
  };

  const floorsVisited =
    audit.floorsVisited && audit.floorsVisited.length > 0
      ? audit.floorsVisited.join(", ")
      : null;
  const status = resolveAuditStatus(audit);
  const startTimestamp = getAuditStartTimestamp(audit);
  const endTimestamp = getAuditEndTimestamp(audit);
  const scoreLabel = formatAuditScore(audit.score);
  const primaryTimestampLabel = t(getAuditTimestampLabelKey(status));
  const stats: Array<{ label: string; value: string }> = [
    {
      label: primaryTimestampLabel,
      value: formatTimestamp(startTimestamp),
    },
  ];

  if (
    status === "audits.status.completed" &&
    audit.scheduledFor &&
    audit.scheduledFor !== audit.occurredAt
  ) {
    stats.push({
      label: t("audits.fields.scheduledFor"),
      value: formatTimestamp(audit.scheduledFor),
    });
  }

  stats.push({
    label: t("audits.fields.duration"),
    value: formatDurationLabel(audit.durationMinutes),
  });

  if (endTimestamp) {
    stats.push({
      label: t("audits.fields.endsAt"),
      value: formatTimestamp(endTimestamp),
    });
  }

  if (scoreLabel) {
    stats.push({
      label: t("audits.fields.score"),
      value: scoreLabel,
    });
  }

  return (
    <DetailScreenLayout>
      <Section>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <TouchableOpacity
              onPress={() =>
                account
                  ? navigation.navigate("AccountDetail", {
                      accountId: account.id,
                    })
                  : undefined
              }
              disabled={!account}
            >
              <Text style={[styles.titleLink, { color: colors.link }]}>
                {account?.name ?? t("common.unknownEntity")}
              </Text>
            </TouchableOpacity>
            <View style={styles.statusRow}>
              <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
                {t("audits.fields.status")}
              </Text>
              <StatusBadge
                tone={getAuditStatusTone(status)}
                labelKey={status}
              />
            </View>
          </View>
          <PrimaryActionButton
            label={t("common.edit")}
            onPress={handleEdit}
            size="compact"
          />
        </View>

        <View style={styles.statsGrid}>
          {stats.map((stat) => (
            <View
              key={stat.label}
              style={[
                styles.statCard,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {stat.label}
              </Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {stat.value}
              </Text>
            </View>
          ))}
        </View>
      </Section>

      {floorsVisited || audit.notes ? (
        <Section>
        {floorsVisited ? (
          <DetailField label={t("audits.fields.floorsVisited")}>
            {floorsVisited}
          </DetailField>
        ) : null}

        {audit.notes ? (
          <DetailField label={t("audits.fields.notes")}>
            {audit.notes}
          </DetailField>
        ) : null}
        </Section>
      ) : null}

      <DangerActionButton
        label={t("audits.deleteButton")}
        onPress={handleDelete}
        size="block"
      />

      {dialogProps ? <ConfirmDialog {...dialogProps} /> : null}
    </DetailScreenLayout>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerText: {
    flex: 1,
    marginRight: 12,
    gap: 6,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  titleLink: {
    fontSize: 24,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  statsGrid: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexBasis: "48%",
  },
  statLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    fontWeight: "600",
    marginBottom: 6,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 32,
  },
});
