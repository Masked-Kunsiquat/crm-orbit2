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
            <StatusBadge tone={getAuditStatusTone(status)} labelKey={status} />
          </View>
          <PrimaryActionButton
            label={t("common.edit")}
            onPress={handleEdit}
            size="compact"
          />
        </View>
      </Section>

      <Section>
        <DetailField label={t("audits.fields.scheduledFor")}>
          {formatTimestamp(audit.scheduledFor)}
        </DetailField>

        {audit.occurredAt ? (
          <DetailField label={t("audits.fields.occurredAt")}>
            {formatTimestamp(audit.occurredAt)}
          </DetailField>
        ) : null}

        <DetailField label={t("audits.fields.duration")}>
          {formatDurationLabel(audit.durationMinutes)}
        </DetailField>

        {startTimestamp && endTimestamp ? (
          <DetailField label={t("audits.fields.endsAt")}>
            {formatTimestamp(endTimestamp)}
          </DetailField>
        ) : null}

        {scoreLabel ? (
          <DetailField label={t("audits.fields.score")}>
            {scoreLabel}
          </DetailField>
        ) : null}

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
  titleLink: {
    fontSize: 24,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 32,
  },
});
