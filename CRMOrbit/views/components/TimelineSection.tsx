import { useState, useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import type { TimelineItem } from "@views/store/timeline";
import type { AutomergeDoc } from "@automerge/schema";
import { EVENT_I18N_KEYS } from "@i18n/events";
import { t } from "@i18n/index";
import { useTheme } from "../hooks";
import { Section } from "./Section";

interface TimelineSectionProps {
  timeline: TimelineItem[];
  doc: AutomergeDoc;
  initialItemsToShow?: number;
  /** Sort order for timeline items. Defaults to 'desc' (newest first). */
  sortOrder?: "asc" | "desc";
}

export const TimelineSection = ({
  timeline,
  doc,
  initialItemsToShow = 5,
  sortOrder = "desc",
}: TimelineSectionProps) => {
  const { colors } = useTheme();
  const [itemsToShow, setItemsToShow] = useState(initialItemsToShow);

  // Reset pagination when timeline length changes (e.g., navigating to different entity)
  useEffect(() => {
    setItemsToShow(initialItemsToShow);
  }, [timeline.length, initialItemsToShow]);

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getContactName = (contact: (typeof doc.contacts)[string]): string => {
    if (!contact) return t("common.unknown");

    // Use legacy name field if available
    if (contact.name) return contact.name;

    // Build name from firstName and lastName
    const parts = [contact.firstName, contact.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : t("common.unknown");
  };

  const getEventContext = (item: TimelineItem): string | null => {
    if (item.kind !== "event") return null;

    const payload = item.event.payload as Record<string, unknown>;

    // For contact method added events
    if (item.event.type === "contact.method.added") {
      const method = payload?.method as Record<string, unknown> | undefined;
      if (method && typeof method.value === "string") {
        const value = method.value;
        let label = "";
        if (typeof method.label === "string") {
          // Translate the label key (e.g., "contact.method.label.work" -> "Work")
          label = t(method.label);
        }
        return label ? `${value} (${label})` : value;
      }
    }

    // For contact method updated events - show before/after if available
    if (item.event.type === "contact.method.updated") {
      const method = payload?.method as Record<string, unknown> | undefined;
      const previousMethod = payload?.previousMethod as
        | Record<string, unknown>
        | undefined;

      if (method && typeof method.value === "string") {
        const newValue = method.value;
        let label = "";
        if (typeof method.label === "string") {
          label = t(method.label);
        }

        // If we have previous method, show before -> after
        if (previousMethod && typeof previousMethod.value === "string") {
          const oldValue = previousMethod.value;
          return `${oldValue} → ${newValue}`;
        }

        // Otherwise just show the new value
        return label ? `${newValue} (${label})` : newValue;
      }
    }

    // For relationship events (account.contact.linked, etc.)
    if (
      item.event.type === "account.contact.linked" ||
      item.event.type === "account.contact.unlinked" ||
      item.event.type === "account.contact.setPrimary" ||
      item.event.type === "account.contact.unsetPrimary"
    ) {
      const contactId =
        typeof payload?.contactId === "string" ? payload.contactId : null;
      const accountId =
        typeof payload?.accountId === "string" ? payload.accountId : null;

      if (contactId && accountId) {
        const contact = doc.contacts[contactId];
        const account = doc.accounts[accountId];
        if (contact && account) {
          const contactName = getContactName(contact);
          const accountName = account.name || t("common.unknown");
          return `${contactName} ↔ ${accountName}`;
        }
      }
    }

    // For contact events, look up the contact name
    if (
      item.event.type === "contact.created" ||
      item.event.type === "contact.updated" ||
      item.event.type === "contact.deleted"
    ) {
      const contactId = item.event.entityId;
      if (contactId) {
        const contact = doc.contacts[contactId];
        if (contact) {
          return getContactName(contact);
        }
      }
      // Fallback to payload data for created/updated events
      if (
        (item.event.type === "contact.created" ||
          item.event.type === "contact.updated") &&
        (typeof payload?.firstName === "string" ||
          typeof payload?.lastName === "string")
      ) {
        const parts = [payload.firstName, payload.lastName]
          .filter((p): p is string => typeof p === "string")
          .filter(Boolean);
        return parts.join(" ") || t("common.unknown");
      }
    }

    // For account events, look up the account name
    if (
      item.event.type === "account.created" ||
      item.event.type === "account.updated" ||
      item.event.type === "account.deleted" ||
      item.event.type === "account.status.updated"
    ) {
      const accountId = item.event.entityId;
      if (accountId) {
        const account = doc.accounts[accountId];
        if (account) {
          return account.name || t("common.unknown");
        }
      }
      // Fallback to payload data
      if (typeof payload?.name === "string") {
        return payload.name;
      }
    }

    // For organization events, look up the organization name
    if (
      item.event.type === "organization.created" ||
      item.event.type === "organization.updated" ||
      item.event.type === "organization.deleted" ||
      item.event.type === "organization.status.updated"
    ) {
      const orgId = item.event.entityId;
      if (orgId) {
        const org = doc.organizations[orgId];
        if (org) {
          return org.name || t("common.unknown");
        }
      }
      // Fallback to payload data
      if (typeof payload?.name === "string") {
        return payload.name;
      }
    }

    // Extract name from payload if available (fallback)
    if (typeof payload?.name === "string") {
      return payload.name;
    }

    return null;
  };

  const renderTimelineItem = (item: TimelineItem) => {
    if (item.kind === "event") {
      const i18nKey = EVENT_I18N_KEYS[item.event.type];
      let eventLabel = i18nKey ? t(i18nKey) : item.event.type;
      const context = getEventContext(item);
      const payload = item.event.payload as Record<string, unknown>;

      // Check for field changes array in update events
      const changes = payload?.changes as
        | Array<{ field: string; oldValue: string; newValue: string }>
        | undefined;

      // If this is an update event with changes, enhance the label with field names
      if (
        changes &&
        changes.length > 0 &&
        (item.event.type === "contact.updated" ||
          item.event.type === "account.updated" ||
          item.event.type === "organization.updated")
      ) {
        const capitalizeField = (field: string) => {
          // Handle camelCase fields
          return field
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase())
            .trim();
        };
        const fieldNames = changes.map((c) => capitalizeField(c.field)).join(", ");
        eventLabel = `${eventLabel} - ${fieldNames}`;
      }

      return (
        <View
          key={item.event.id}
          style={[styles.timelineItem, { borderLeftColor: colors.border }]}
        >
          <View style={styles.timelineContent}>
            <Text style={[styles.eventLabel, { color: colors.textPrimary }]}>
              {eventLabel}
            </Text>
            {context && (
              <Text
                style={[styles.contextText, { color: colors.textSecondary }]}
              >
                {context}
              </Text>
            )}
            {changes && changes.length > 0 && (
              <View style={styles.changesContainer}>
                {changes.map((change, idx) => {
                  // Format the change display based on whether it's an add/remove/update
                  let displayText = "";
                  if (change.oldValue === "" && change.newValue !== "") {
                    // Added
                    displayText = `+ ${change.newValue}`;
                  } else if (change.oldValue !== "" && change.newValue === "") {
                    // Removed
                    displayText = `- ${change.oldValue}`;
                  } else {
                    // Updated
                    displayText = `${change.oldValue} → ${change.newValue}`;
                  }

                  return (
                    <Text
                      key={idx}
                      style={[
                        styles.changeText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {displayText}
                    </Text>
                  );
                })}
              </View>
            )}
            <Text style={[styles.timestamp, { color: colors.textMuted }]}>
              {formatTimestamp(item.timestamp)}
            </Text>
          </View>
        </View>
      );
    }

    if (item.kind === "note") {
      return (
        <View
          key={item.note.id}
          style={[styles.timelineItem, { borderLeftColor: colors.border }]}
        >
          <View style={styles.timelineContent}>
            <Text style={[styles.eventLabel, { color: colors.textPrimary }]}>
              {t("events.note.created")}: {item.note.title}
            </Text>
            {item.note.body && (
              <Text
                style={[styles.noteBody, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {item.note.body}
              </Text>
            )}
            <Text style={[styles.timestamp, { color: colors.textMuted }]}>
              {formatTimestamp(item.timestamp)}
            </Text>
          </View>
        </View>
      );
    }

    if (item.kind === "interaction") {
      return (
        <View
          key={item.interaction.id}
          style={[styles.timelineItem, { borderLeftColor: colors.border }]}
        >
          <View style={styles.timelineContent}>
            <Text style={[styles.eventLabel, { color: colors.textPrimary }]}>
              {t("events.interaction.logged")}
            </Text>
            {item.interaction.summary && (
              <Text
                style={[styles.noteBody, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {item.interaction.summary}
              </Text>
            )}
            <Text style={[styles.timestamp, { color: colors.textMuted }]}>
              {formatTimestamp(item.timestamp)}
            </Text>
          </View>
        </View>
      );
    }

    return null;
  };

  // Sort timeline based on sortOrder prop
  const sortedTimeline =
    sortOrder === "desc" ? [...timeline].reverse() : timeline;

  const visibleTimeline = sortedTimeline.slice(0, itemsToShow);
  const hasMore = sortedTimeline.length > itemsToShow;

  const handleLoadMore = () => {
    setItemsToShow((prev) => prev + initialItemsToShow);
  };

  return (
    <Section>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        {t("timeline.title")}
      </Text>
      {timeline.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {t("timeline.empty")}
        </Text>
      ) : (
        <View style={styles.timelineContainer}>
          {visibleTimeline.map((item) => renderTimelineItem(item))}
          {hasMore && (
            <TouchableOpacity
              style={[styles.loadMoreButton, { borderColor: colors.border }]}
              onPress={handleLoadMore}
            >
              <Text style={[styles.loadMoreText, { color: colors.accent }]}>
                {t("timeline.loadMore")} ({sortedTimeline.length - itemsToShow}{" "}
                {t("timeline.moreItems")})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </Section>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  timelineContainer: {
    marginTop: 8,
  },
  timelineItem: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  timelineContent: {
    gap: 4,
  },
  eventLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  contextText: {
    fontWeight: "400",
  },
  changesContainer: {
    gap: 2,
    marginTop: 2,
  },
  changeText: {
    fontSize: 13,
    fontFamily: "monospace",
  },
  noteBody: {
    fontSize: 13,
    marginTop: 2,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  loadMoreButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginTop: 8,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
