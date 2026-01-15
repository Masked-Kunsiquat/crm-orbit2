import { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  useCalendarEvent,
  useAccount,
  useEntitiesForCalendarEvent,
  useTimeline,
  useDoc,
} from "../../store/store";
import { useCalendarEventActions } from "../../hooks/useCalendarEventActions";
import {
  DetailScreenLayout,
  Section,
  PrimaryActionButton,
  DangerActionButton,
  ConfirmDialog,
  LinkEntityToCalendarEventModal,
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
import { openMapsWithAddress } from "@domains/linking.utils";
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

const getStatusTone = (status: string): "success" | "warning" | "danger" => {
  if (status === "calendarEvent.status.completed") {
    return "success";
  }
  if (status === "calendarEvent.status.canceled") {
    return "danger";
  }
  return "warning";
};

export const CalendarEventDetailScreen = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const deviceId = useDeviceId();
  const { calendarEventId, occurrenceTimestamp } = route.params;
  const calendarEvent = useCalendarEvent(calendarEventId);
  const linkedEntities = useEntitiesForCalendarEvent(calendarEventId);
  const timeline = useTimeline("calendarEvent", calendarEventId);
  const doc = useDoc();
  const { deleteCalendarEvent, unlinkCalendarEvent } =
    useCalendarEventActions(deviceId);
  const { dialogProps, showDialog, showAlert } = useConfirmDialog();
  const [showLinkModal, setShowLinkModal] = useState(false);

  const existingEntityIds = useMemo(() => {
    return new Set(linkedEntities.map((entity) => entity.entityId));
  }, [linkedEntities]);

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

  const isAudit = calendarEvent.type === "calendarEvent.type.audit";
  const isCompleted = calendarEvent.status === "calendarEvent.status.completed";
  const isRecurring = Boolean(
    calendarEvent.recurrenceRule || calendarEvent.recurrenceId,
  );
  const resolvedScheduledFor =
    occurrenceTimestamp ?? calendarEvent.scheduledFor;
  const timestampLabel = isCompleted
    ? t("calendarEvents.occurredAt")
    : t("calendarEvents.scheduledFor");
  const timestampValue = isCompleted
    ? (calendarEvent.occurredAt ?? resolvedScheduledFor)
    : resolvedScheduledFor;
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
  const location = calendarEvent.location?.trim() ?? "";

  return (
    <DetailScreenLayout>
      <Section>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[styles.typeLabel, { color: colors.textSecondary }]}>
              {t(calendarEvent.type)}
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
            {isRecurring ? (
              <View
                style={[
                  styles.recurrenceBadge,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="repeat-outline"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text
                  style={[
                    styles.recurrenceBadgeText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t("calendarEvents.recurrence.badge")}
                </Text>
              </View>
            ) : null}
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

      {calendarEvent.description || location ? (
        <Section>
          {calendarEvent.description ? (
            <DetailField label={t("calendarEvents.fields.description")}>
              {calendarEvent.description}
            </DetailField>
          ) : null}
          {location ? (
            <DetailField label={t("calendarEvents.fields.location")}>
              <View style={styles.locationRow}>
                <Text
                  style={[styles.locationText, { color: colors.textPrimary }]}
                >
                  {location}
                </Text>
                <TouchableOpacity
                  onPress={() => void openMapsWithAddress(location)}
                  style={styles.mapIconButton}
                >
                  <Ionicons
                    name="location-outline"
                    size={22}
                    color={colors.accent}
                  />
                </TouchableOpacity>
              </View>
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
          <TouchableOpacity
            style={[
              styles.linkButton,
              {
                backgroundColor: colors.surfaceElevated,
              },
            ]}
            onPress={() => setShowLinkModal(true)}
          >
            <Text style={[styles.linkButtonText, { color: colors.accent }]}>
              {t("calendarEvents.linkEntityButton")}
            </Text>
          </TouchableOpacity>
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

      <LinkEntityToCalendarEventModal
        visible={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        calendarEventId={calendarEventId}
        existingEntityIds={existingEntityIds}
      />

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
  recurrenceBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  recurrenceBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  date: {
    fontSize: 14,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  locationText: {
    flex: 1,
    fontSize: 16,
  },
  mapIconButton: {
    padding: 4,
    marginLeft: 8,
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
