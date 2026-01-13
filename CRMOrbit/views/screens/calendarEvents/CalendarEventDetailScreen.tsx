import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
} from "react-native";

import {
  useCalendarEvent,
  useAccount,
  useEntitiesForCalendarEvent,
  useTimeline,
  useDoc,
} from "../../store/store";
import { useCalendarEventActions } from "../../hooks/useCalendarEventActions";
import { useEntityLinkActions } from "../../hooks/useEntityLinkActions";
import {
  DetailScreenLayout,
  Section,
  PrimaryActionButton,
  DangerActionButton,
  ConfirmDialog,
  TimelineSection,
  StatusBadge,
  DetailField,
} from "../../components";
import { useDeviceId, useTheme } from "../../hooks";
import { t } from "@i18n/index";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import {
  addMinutesToTimestamp,
  formatDurationLabel,
} from "../../utils/duration";
import type { EventsStackScreenProps } from "../../navigation/types";
import type { LinkedEntityInfo } from "../../store/selectors";

type Props = EventsStackScreenProps<"CalendarEventDetail">;

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

const getStatusTone = (status: string): "success" | "warning" | "default" => {
  if (status === "calendarEvent.status.completed") {
    return "success";
  }
  if (status === "calendarEvent.status.canceled") {
    return "warning";
  }
  return "default";
};

export const CalendarEventDetailScreen = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const deviceId = useDeviceId();
  const { calendarEventId } = route.params;
  const calendarEvent = useCalendarEvent(calendarEventId);
  const linkedEntities = useEntitiesForCalendarEvent(calendarEventId);
  const timeline = useTimeline("calendarEvent", calendarEventId);
  const doc = useDoc();
  const { deleteCalendarEvent } = useCalendarEventActions(deviceId);
  const { unlinkCalendarEvent } = useEntityLinkActions(deviceId);
  const { dialogProps, showDialog, showAlert } = useConfirmDialog();

  // Audit-specific data
  const account = useAccount(calendarEvent?.auditData?.accountId ?? "");

  const handleEdit = () => {
    if (!calendarEvent?.id) return;
    navigation.navigate("CalendarEventForm", {
      calendarEventId: calendarEvent.id,
    });
  };

  if (!calendarEvent) {
    return (
      <DetailScreenLayout>
        <Text style={[styles.errorText, { color: colors.error }]}>
          {t("calendarEvents.notFound")}
        </Text>
      </DetailScreenLayout>
    );
  }

  const handleUnlink = (
    linkId: string,
    name: string,
    entityType: LinkedEntityInfo["entityType"],
    entityId: string,
  ) => {
    showDialog({
      title: t("calendarEvents.unlinkTitle"),
      message: t("calendarEvents.unlinkConfirmation").replace("{name}", name),
      confirmLabel: t("calendarEvents.unlinkAction"),
      confirmVariant: "danger",
      cancelLabel: t("common.cancel"),
      onConfirm: () => {
        unlinkCalendarEvent(linkId, calendarEventId, entityType, entityId);
      },
    });
  };

  const navigateToEntity = (
    entityType: LinkedEntityInfo["entityType"],
    entityId: string,
  ) => {
    switch (entityType) {
      case "organization":
        navigation.navigate("OrganizationDetail", {
          organizationId: entityId,
        });
        break;
      case "account":
        navigation.navigate("AccountDetail", {
          accountId: entityId,
        });
        break;
      case "contact":
        navigation.navigate("ContactDetail", {
          contactId: entityId,
        });
        break;
      case "note":
        navigation.navigate("NoteDetail", {
          noteId: entityId,
        });
        break;
      // Cannot navigate to a calendar event from itself
      case "calendarEvent":
      case "audit":
      case "interaction":
      default:
        break;
    }
  };

  const handleDelete = () => {
    showDialog({
      title: t("calendarEvents.deleteTitle"),
      message: t("calendarEvents.deleteConfirmation"),
      confirmLabel: t("common.delete"),
      confirmVariant: "danger",
      cancelLabel: t("common.cancel"),
      onConfirm: () => {
        const result = deleteCalendarEvent(calendarEvent.id);
        if (result.success) {
          navigation.goBack();
        } else {
          showAlert(
            t("common.error"),
            result.error ?? t("calendarEvents.deleteError"),
            t("common.ok"),
          );
        }
      },
    });
  };

  const isAudit = calendarEvent.type === "audit";
  const isCompleted = calendarEvent.status === "calendarEvent.status.completed";
  const timestampLabel = isCompleted
    ? t("calendarEvents.occurredAt")
    : t("calendarEvents.scheduledFor");
  const timestampValue = isCompleted
    ? (calendarEvent.occurredAt ?? calendarEvent.scheduledFor)
    : calendarEvent.scheduledFor;
  const formattedTimestamp = formatTimestamp(timestampValue);
  const endTimestamp = addMinutesToTimestamp(
    timestampValue,
    calendarEvent.durationMinutes,
  );

  const floorsVisited =
    isAudit &&
    calendarEvent.auditData?.floorsVisited &&
    calendarEvent.auditData.floorsVisited.length > 0
      ? calendarEvent.auditData.floorsVisited.join(", ")
      : null;

  return (
    <DetailScreenLayout>
      <Section>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[styles.typeLabel, { color: colors.textSecondary }]}>
              {t(`calendarEvent.type.${calendarEvent.type}`)}
            </Text>
            {isAudit && account ? (
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("AccountDetail", {
                    accountId: account.id,
                  })
                }
              >
                <Text style={[styles.titleLink, { color: colors.link }]}>
                  {account.name}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.summary, { color: colors.textPrimary }]}>
                {calendarEvent.summary}
              </Text>
            )}
            <View style={styles.statusRow}>
              <Text
                style={[styles.statusLabel, { color: colors.textSecondary }]}
              >
                {t("calendarEvents.statusLabel")}:
              </Text>
              <StatusBadge
                tone={getStatusTone(calendarEvent.status)}
                labelKey={calendarEvent.status}
              />
            </View>
            <Text style={[styles.date, { color: colors.textSecondary }]}>
              {timestampLabel}: {formattedTimestamp}
            </Text>
            {calendarEvent.durationMinutes ? (
              <Text style={[styles.date, { color: colors.textSecondary }]}>
                {t("calendarEvents.fields.duration")}:{" "}
                {formatDurationLabel(calendarEvent.durationMinutes)}
              </Text>
            ) : null}
            {endTimestamp ? (
              <Text style={[styles.date, { color: colors.textSecondary }]}>
                {t("calendarEvents.fields.endsAt")}:{" "}
                {formatTimestamp(endTimestamp)}
              </Text>
            ) : null}
            {isAudit && calendarEvent.auditData?.score !== undefined ? (
              <Text style={[styles.date, { color: colors.textSecondary }]}>
                {t("calendarEvents.fields.score")}:{" "}
                {calendarEvent.auditData.score}%
              </Text>
            ) : null}
          </View>
          <PrimaryActionButton
            label={t("common.edit")}
            onPress={handleEdit}
            size="compact"
          />
        </View>
      </Section>

      {calendarEvent.description || calendarEvent.location ? (
        <Section>
          {calendarEvent.description ? (
            <DetailField label={t("calendarEvents.fields.description")}>
              {calendarEvent.description}
            </DetailField>
          ) : null}
          {calendarEvent.location ? (
            <DetailField label={t("calendarEvents.fields.location")}>
              {calendarEvent.location}
            </DetailField>
          ) : null}
        </Section>
      ) : null}

      {isAudit && floorsVisited ? (
        <Section>
          <DetailField label={t("calendarEvents.fields.floorsVisited")}>
            {floorsVisited}
          </DetailField>
        </Section>
      ) : null}

      <Section>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t("calendarEvents.linkedTo")} ({linkedEntities.length})
          </Text>
          {/* TODO: Add link button when LinkEntityToCalendarEventModal is implemented */}
        </View>
        {linkedEntities.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t("calendarEvents.noLinkedEntities")}
          </Text>
        ) : (
          linkedEntities.map((entity) => {
            const displayName = entity.name ?? t("common.unknownEntity");
            return (
              <View
                key={entity.linkId}
                style={[
                  styles.linkedItem,
                  { borderTopColor: colors.borderLight },
                ]}
              >
                <Pressable
                  style={styles.linkedItemPressable}
                  onPress={() =>
                    navigateToEntity(entity.entityType, entity.entityId)
                  }
                >
                  <Text
                    style={[
                      styles.linkedItemType,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {entity.entityType}
                  </Text>
                  <Text
                    style={[
                      styles.linkedItemName,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {displayName}
                  </Text>
                </Pressable>
                <TouchableOpacity
                  style={[
                    styles.unlinkButton,
                    { backgroundColor: colors.errorBg },
                  ]}
                  onPress={() =>
                    handleUnlink(
                      entity.linkId,
                      displayName,
                      entity.entityType,
                      entity.entityId,
                    )
                  }
                >
                  <Text
                    style={[styles.unlinkButtonText, { color: colors.error }]}
                  >
                    {t("calendarEvents.unlinkButton")}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </Section>

      <TimelineSection timeline={timeline} doc={doc} />

      <DangerActionButton
        label={t("calendarEvents.deleteButton")}
        onPress={handleDelete}
        size="block"
      />

      {/* TODO: Add LinkEntityToCalendarEventModal when implemented */}
      {/* <LinkEntityToCalendarEventModal
        visible={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        calendarEventId={calendarEventId}
        existingEntityIds={existingEntityIds}
      /> */}

      {dialogProps ? <ConfirmDialog {...dialogProps} /> : null}
    </DetailScreenLayout>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  typeLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: "600",
    marginBottom: 8,
  },
  titleLink: {
    fontSize: 24,
    fontWeight: "700",
    textDecorationLine: "underline",
    marginBottom: 8,
  },
  summary: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    lineHeight: 24,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  date: {
    fontSize: 14,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  linkButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  linkButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  linkedItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  linkedItemPressable: {
    flex: 1,
  },
  linkedItemType: {
    fontSize: 12,
    textTransform: "capitalize",
  },
  linkedItemName: {
    fontSize: 15,
  },
  unlinkButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  unlinkButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 32,
  },
});
