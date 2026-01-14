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

import type { CalendarEvent, CalendarEventType } from "@domains/calendarEvent";
import type { EntityId } from "@domains/shared/types";
import type { EntityLinkType } from "@domains/relations/entityLink";
import { t } from "@i18n/index";

import { useAccounts, useCalendarEvents } from "../store/store";
import { useCalendarEventActions } from "../hooks/useCalendarEventActions";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import { useDeviceId, useEntityLinkMap, useTheme } from "../hooks";
import { ConfirmDialog } from "./ConfirmDialog";
import { Section } from "./Section";
import { StatusBadge } from "./StatusBadge";
import { formatDurationLabel } from "../utils/duration";

export interface CalendarEventsSectionProps {
  entityType: EntityLinkType;
  entityId: EntityId;
  title?: string;
  filterType?: CalendarEventType;
  maxVisible?: number;
  onEventPress: (eventId: string) => void;
  onAddEvent: () => void;
  onLinkEvent?: () => void;
}

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

const getEventTimestamp = (event: CalendarEvent): string | undefined => {
  if (event.status === "calendarEvent.status.completed") {
    return event.occurredAt ?? event.scheduledFor;
  }
  return event.scheduledFor ?? event.occurredAt;
};

const getStatusTone = (
  status: CalendarEvent["status"],
): "success" | "warning" | "danger" => {
  if (status === "calendarEvent.status.completed") {
    return "success";
  }
  if (status === "calendarEvent.status.canceled") {
    return "danger";
  }
  return "warning";
};

const getSortTimestamp = (event: CalendarEvent): number => {
  const timestamp = getEventTimestamp(event);
  if (!timestamp) {
    return Number.NEGATIVE_INFINITY;
  }
  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
};

export const CalendarEventsSection = ({
  entityType,
  entityId,
  title,
  filterType,
  maxVisible,
  onEventPress,
  onAddEvent,
  onLinkEvent,
}: CalendarEventsSectionProps) => {
  const { colors } = useTheme();
  const deviceId = useDeviceId();
  const { dialogProps, showDialog } = useConfirmDialog();
  const [showAllModal, setShowAllModal] = useState(false);
  const calendarEvents = useCalendarEvents(entityType, entityId);
  const accounts = useAccounts();
  const { unlinkCalendarEvent } = useCalendarEventActions(deviceId);
  const linkIdsByEventId = useEntityLinkMap(
    "calendarEvent",
    entityType,
    entityId,
  );

  const accountNames = useMemo(() => {
    return new Map(accounts.map((account) => [account.id, account.name]));
  }, [accounts]);

  const filteredEvents = useMemo(() => {
    if (!filterType) {
      return calendarEvents;
    }
    return calendarEvents.filter((event) => event.type === filterType);
  }, [calendarEvents, filterType]);

  const sortedEvents = useMemo(() => {
    return [...filteredEvents].sort(
      (left, right) => getSortTimestamp(right) - getSortTimestamp(left),
    );
  }, [filteredEvents]);

  const visibleLimit = maxVisible ?? PREVIEW_LIMIT;
  const visibleEvents = sortedEvents.slice(0, visibleLimit);
  const hasMore = sortedEvents.length > visibleLimit;

  const getDisplayName = (event: CalendarEvent): string => {
    if (event.type === "audit" && event.auditData?.accountId) {
      return (
        accountNames.get(event.auditData.accountId) ?? t("common.unknownEntity")
      );
    }
    return event.summary;
  };

  const getMetaText = (event: CalendarEvent): string => {
    const timestampLabel =
      event.status === "calendarEvent.status.completed"
        ? t("calendarEvents.occurredAt")
        : t("calendarEvents.scheduledFor");
    const timestampValue = formatTimestamp(getEventTimestamp(event));
    const parts: string[] = [];

    if (event.status !== "calendarEvent.status.completed") {
      parts.push(`${t("calendarEvents.statusLabel")}: ${t(event.status)}`);
    }

    parts.push(`${timestampLabel}: ${timestampValue}`);

    return parts.join(" · ");
  };

  const getDescription = (event: CalendarEvent): string | undefined => {
    const lines: string[] = [];
    if (event.durationMinutes) {
      lines.push(
        `${t("calendarEvents.fields.duration")}: ${formatDurationLabel(
          event.durationMinutes,
        )}`,
      );
    }
    if (event.type === "audit" && event.auditData?.score !== undefined) {
      lines.push(
        `${t("calendarEvents.fields.score")}: ${event.auditData.score}%`,
      );
    }
    if (event.location) {
      lines.push(`${t("calendarEvents.fields.location")}: ${event.location}`);
    }
    return lines.length > 0 ? lines.join("\n") : undefined;
  };

  const getFootnote = (event: CalendarEvent): string | undefined => {
    if (event.type === "audit") {
      const floors = event.auditData?.floorsVisited;
      if (floors && floors.length > 0) {
        return `${t("calendarEvents.fields.floorsVisited")}: ${floors.join(", ")}`;
      }
      return undefined;
    }
    return event.description?.trim() || undefined;
  };

  const handleUnlink = (event: CalendarEvent, linkId?: EntityId) => {
    if (!linkId) {
      return;
    }
    const displayName = getDisplayName(event);
    showDialog({
      title: t("calendarEvents.unlinkTitle"),
      message: t("calendarEvents.unlinkConfirmation").replace(
        "{name}",
        displayName,
      ),
      confirmLabel: t("calendarEvents.unlinkAction"),
      confirmVariant: "danger",
      cancelLabel: t("common.cancel"),
      onConfirm: () => {
        unlinkCalendarEvent(linkId, event.id, entityType, entityId);
      },
    });
  };

  const renderEventCard = (event: CalendarEvent) => {
    const displayName = getDisplayName(event);
    const statusTone = getStatusTone(event.status);
    const metaText = getMetaText(event);
    const description = getDescription(event);
    const footnote = getFootnote(event);
    const linkId = linkIdsByEventId.get(event.id);

    return (
      <View
        key={event.id}
        style={[styles.eventCard, { backgroundColor: colors.surfaceElevated }]}
      >
        <Pressable
          style={styles.eventCardRow}
          onPress={() => onEventPress(event.id)}
        >
          <View style={styles.eventCardContent}>
            <View style={styles.eventHeaderRow}>
              <Text style={[styles.eventType, { color: colors.textSecondary }]}>
                {t(`calendarEvent.type.${event.type}`)}
              </Text>
              <StatusBadge tone={statusTone} labelKey={event.status} />
            </View>
            <Text
              style={[styles.eventTitle, { color: colors.textPrimary }]}
              numberOfLines={2}
            >
              {displayName}
            </Text>
            <Text style={[styles.eventMeta, { color: colors.textMuted }]}>
              {metaText}
            </Text>
            {description ? (
              <Text
                style={[styles.eventMeta, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {description}
              </Text>
            ) : null}
            {footnote ? (
              <Text
                style={[styles.eventNotes, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {footnote}
              </Text>
            ) : null}
          </View>
        </Pressable>
        {linkId ? (
          <TouchableOpacity
            style={[styles.unlinkButton, { backgroundColor: colors.errorBg }]}
            onPress={() => handleUnlink(event, linkId)}
            accessibilityLabel={t("calendarEvents.unlinkButton")}
          >
            <MaterialCommunityIcons
              name="link-variant-minus"
              size={18}
              color={colors.error}
            />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <Section>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {title ?? t("calendarEvents.listTitle")} ({sortedEvents.length})
        </Text>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.accent }]}
            onPress={onAddEvent}
            accessibilityLabel={t("calendarEvents.createTitle")}
          >
            <MaterialCommunityIcons
              name="plus"
              size={18}
              color={colors.onAccent}
            />
          </TouchableOpacity>
          {onLinkEvent ? (
            <TouchableOpacity
              style={[
                styles.iconButton,
                styles.iconButtonSecondary,
                { backgroundColor: colors.surfaceElevated },
              ]}
              onPress={onLinkEvent}
              accessibilityLabel={t("calendarEvents.linkEntityButton")}
            >
              <MaterialCommunityIcons
                name="link-variant-plus"
                size={18}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      {sortedEvents.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {t("calendarEvents.emptyTitle")}
        </Text>
      ) : (
        visibleEvents.map((event) => renderEventCard(event))
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
                {title ?? t("calendarEvents.listTitle")} ({sortedEvents.length})
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
              data={sortedEvents}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const displayName = getDisplayName(item);
                const metaText = getMetaText(item);
                return (
                  <Pressable
                    style={[
                      styles.modalItem,
                      { borderBottomColor: colors.borderLight },
                    ]}
                    onPress={() => {
                      setShowAllModal(false);
                      onEventPress(item.id);
                    }}
                  >
                    <View style={styles.modalItemRow}>
                      <Text
                        style={[
                          styles.modalItemType,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {t(`calendarEvent.type.${item.type}`)}
                      </Text>
                      <StatusBadge
                        tone={getStatusTone(item.status)}
                        labelKey={item.status}
                      />
                    </View>
                    <Text
                      style={[
                        styles.modalItemTitle,
                        { color: colors.textPrimary },
                      ]}
                      numberOfLines={2}
                    >
                      {displayName}
                    </Text>
                    <Text
                      style={[
                        styles.modalItemMeta,
                        { color: colors.textMuted },
                      ]}
                    >
                      {metaText}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
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
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonSecondary: {
    marginLeft: 8,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  eventCard: {
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  eventCardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  eventCardContent: {
    flex: 1,
  },
  eventHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  eventType: {
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: "600",
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  eventMeta: {
    fontSize: 12,
    marginBottom: 2,
  },
  eventNotes: {
    fontSize: 13,
    marginTop: 4,
  },
  unlinkButton: {
    marginTop: 8,
    width: 44,
    height: 44,
    borderRadius: 12,
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
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
  modalItemType: {
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: "600",
    flex: 1,
  },
  modalItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  modalItemMeta: {
    fontSize: 12,
  },
});
