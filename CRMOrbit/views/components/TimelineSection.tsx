import { useState, useEffect, useMemo } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import type { TimelineItem } from "@views/store/timeline";
import type { AutomergeDoc } from "@automerge/schema";
import { EVENT_I18N_KEYS } from "@i18n/events";
import { t } from "@i18n/index";
import type { Event } from "@events/event";
import { resolveEntityId } from "@reducers/shared";
import { useTheme } from "../hooks";
import { Section } from "./Section";
import {
  detectContactChanges,
  detectAccountChanges,
  detectOrganizationChanges,
  detectNoteChanges,
  detectInteractionChanges,
  type FieldChange,
} from "../timeline/changeDetection";
import type { Contact, ContactMethod } from "@domains/contact";
import type { Account } from "@domains/account";
import type { Organization } from "@domains/organization";
import type { Note } from "@domains/note";
import type { Interaction, InteractionStatus } from "@domains/interaction";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const resolveContactMethods = (
  value: unknown,
  fallback: Contact["methods"],
): Contact["methods"] => {
  if (isRecord(value)) {
    const emails = value.emails;
    const phones = value.phones;
    if (Array.isArray(emails) && Array.isArray(phones)) {
      return {
        emails: emails as ContactMethod[],
        phones: phones as ContactMethod[],
      };
    }
  }

  return fallback;
};

const isContactType = (value: unknown): value is Contact["type"] =>
  value === "contact.type.internal" ||
  value === "contact.type.external" ||
  value === "contact.type.vendor";

const isAccountStatus = (value: unknown): value is Account["status"] =>
  value === "account.status.active" || value === "account.status.inactive";

const isOrganizationStatus = (
  value: unknown,
): value is Organization["status"] =>
  value === "organization.status.active" ||
  value === "organization.status.inactive";

const isInteractionType = (value: unknown): value is Interaction["type"] =>
  value === "interaction.type.call" ||
  value === "interaction.type.email" ||
  value === "interaction.type.meeting" ||
  value === "interaction.type.other";

const isInteractionStatus = (value: unknown): value is InteractionStatus =>
  value === "interaction.status.scheduled" ||
  value === "interaction.status.completed" ||
  value === "interaction.status.canceled";

const tryResolveEntityId = (
  event: Event,
  payload: Record<string, unknown>,
): string | null => {
  try {
    return resolveEntityId(event, payload as { id?: string });
  } catch {
    return null;
  }
};

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

  const changesByEventId = useMemo(() => {
    const changes = new Map<string, FieldChange[]>();
    const contacts = new Map<string, Contact>();
    const accounts = new Map<string, Account>();
    const organizations = new Map<string, Organization>();
    const notes = new Map<string, Note>();
    const interactions = new Map<string, Interaction>();

    const buildContactState = (
      id: string,
      payload: Record<string, unknown>,
      timestamp: string,
      existing?: Contact,
    ): Contact => ({
      id,
      name: typeof payload.name === "string" ? payload.name : existing?.name,
      firstName:
        typeof payload.firstName === "string"
          ? payload.firstName
          : (existing?.firstName ?? ""),
      lastName:
        typeof payload.lastName === "string"
          ? payload.lastName
          : (existing?.lastName ?? ""),
      type: isContactType(payload.type)
        ? payload.type
        : (existing?.type ?? "contact.type.internal"),
      title:
        typeof payload.title === "string" ? payload.title : existing?.title,
      methods: resolveContactMethods(
        payload.methods,
        existing?.methods ?? { emails: [], phones: [] },
      ),
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });

    const buildAccountState = (
      id: string,
      payload: Record<string, unknown>,
      timestamp: string,
      existing?: Account,
    ): Account => ({
      id,
      organizationId:
        typeof payload.organizationId === "string"
          ? payload.organizationId
          : (existing?.organizationId ?? ""),
      name:
        typeof payload.name === "string"
          ? payload.name
          : (existing?.name ?? ""),
      status: isAccountStatus(payload.status)
        ? payload.status
        : (existing?.status ?? "account.status.active"),
      minFloor:
        typeof payload.minFloor === "number"
          ? payload.minFloor
          : existing?.minFloor,
      maxFloor:
        typeof payload.maxFloor === "number"
          ? payload.maxFloor
          : existing?.maxFloor,
      excludedFloors: Array.isArray(payload.excludedFloors)
        ? (payload.excludedFloors as number[])
        : existing?.excludedFloors,
      addresses:
        payload.addresses !== undefined
          ? (payload.addresses as Account["addresses"])
          : existing?.addresses,
      website:
        typeof payload.website === "string"
          ? payload.website
          : existing?.website,
      socialMedia:
        payload.socialMedia !== undefined
          ? (payload.socialMedia as Account["socialMedia"])
          : existing?.socialMedia,
      metadata:
        payload.metadata !== undefined
          ? (payload.metadata as Record<string, unknown>)
          : existing?.metadata,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });

    const buildOrganizationState = (
      id: string,
      payload: Record<string, unknown>,
      timestamp: string,
      existing?: Organization,
    ): Organization => ({
      id,
      name:
        typeof payload.name === "string"
          ? payload.name
          : (existing?.name ?? ""),
      status: isOrganizationStatus(payload.status)
        ? payload.status
        : (existing?.status ?? "organization.status.active"),
      logoUri:
        typeof payload.logoUri === "string"
          ? payload.logoUri
          : existing?.logoUri,
      website:
        typeof payload.website === "string"
          ? payload.website
          : existing?.website,
      socialMedia:
        payload.socialMedia !== undefined
          ? (payload.socialMedia as Organization["socialMedia"])
          : existing?.socialMedia,
      metadata:
        payload.metadata !== undefined
          ? (payload.metadata as Record<string, unknown>)
          : existing?.metadata,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });

    const buildNoteState = (
      id: string,
      payload: Record<string, unknown>,
      timestamp: string,
      existing?: Note,
    ): Note => ({
      id,
      title:
        typeof payload.title === "string"
          ? payload.title
          : (existing?.title ?? ""),
      body:
        typeof payload.body === "string"
          ? payload.body
          : (existing?.body ?? ""),
      createdAt:
        typeof payload.createdAt === "string"
          ? payload.createdAt
          : (existing?.createdAt ?? timestamp),
      updatedAt: timestamp,
    });

    const buildInteractionState = (
      id: string,
      payload: Record<string, unknown>,
      timestamp: string,
      existing?: Interaction,
    ): Interaction => ({
      id,
      type: isInteractionType(payload.type)
        ? payload.type
        : (existing?.type ?? "interaction.type.call"),
      status: isInteractionStatus(payload.status)
        ? payload.status
        : existing?.status,
      scheduledFor:
        typeof payload.scheduledFor === "string"
          ? payload.scheduledFor
          : existing?.scheduledFor,
      occurredAt:
        typeof payload.occurredAt === "string"
          ? payload.occurredAt
          : typeof payload.scheduledFor === "string"
            ? payload.scheduledFor
            : (existing?.occurredAt ?? timestamp),
      summary:
        typeof payload.summary === "string"
          ? payload.summary
          : (existing?.summary ?? ""),
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });

    for (const item of timeline) {
      if (item.kind !== "event") continue;

      const event = item.event;
      const payload = isRecord(event.payload) ? event.payload : {};

      switch (event.type) {
        case "contact.created": {
          const id = tryResolveEntityId(event, payload);
          if (!id) break;
          contacts.set(id, buildContactState(id, payload, event.timestamp));
          break;
        }
        case "contact.method.added": {
          const id = tryResolveEntityId(event, payload);
          if (!id) break;
          const existing = id ? contacts.get(id) : undefined;
          const methodType = payload.methodType;
          const method = payload.method as ContactMethod | undefined;
          if (
            !existing ||
            (methodType !== "emails" && methodType !== "phones") ||
            !method
          ) {
            break;
          }
          contacts.set(id, {
            ...existing,
            methods: {
              ...existing.methods,
              [methodType]: [...existing.methods[methodType], method],
            },
            updatedAt: event.timestamp,
          });
          break;
        }
        case "contact.method.updated": {
          const id = tryResolveEntityId(event, payload);
          if (!id) break;
          const existing = id ? contacts.get(id) : undefined;
          const methodType = payload.methodType;
          const method = payload.method as ContactMethod | undefined;
          const index =
            typeof payload.index === "number" ? payload.index : undefined;
          if (
            !existing ||
            (methodType !== "emails" && methodType !== "phones") ||
            !method ||
            index === undefined ||
            index < 0 ||
            index >= existing.methods[methodType].length
          ) {
            break;
          }
          const nextMethods = [...existing.methods[methodType]];
          nextMethods[index] = method;
          contacts.set(id, {
            ...existing,
            methods: {
              ...existing.methods,
              [methodType]: nextMethods,
            },
            updatedAt: event.timestamp,
          });
          break;
        }
        case "contact.updated": {
          const id = tryResolveEntityId(event, payload);
          if (!id) break;
          const existing = contacts.get(id);
          const next = buildContactState(
            id,
            payload,
            event.timestamp,
            existing,
          );
          if (existing) {
            const diff = detectContactChanges(existing, {
              firstName: next.firstName,
              lastName: next.lastName,
              type: next.type,
              title: next.title,
              methods: next.methods,
            });
            if (diff.length > 0) {
              changes.set(event.id, diff);
            }
          }
          contacts.set(id, next);
          break;
        }
        case "contact.deleted": {
          const id = tryResolveEntityId(event, payload);
          if (id) contacts.delete(id);
          break;
        }
        case "account.created": {
          const id = tryResolveEntityId(event, payload);
          if (!id) break;
          accounts.set(id, buildAccountState(id, payload, event.timestamp));
          break;
        }
        case "account.status.updated": {
          const id = tryResolveEntityId(event, payload);
          if (!id) break;
          const existing = id ? accounts.get(id) : undefined;
          if (!existing || !isAccountStatus(payload.status)) break;
          accounts.set(id, {
            ...existing,
            status: payload.status,
            updatedAt: event.timestamp,
          });
          break;
        }
        case "account.updated": {
          const id = tryResolveEntityId(event, payload);
          if (!id) break;
          const existing = accounts.get(id);
          const next = buildAccountState(
            id,
            payload,
            event.timestamp,
            existing,
          );
          if (existing) {
            const diff = detectAccountChanges(existing, {
              name: next.name,
              status: next.status,
              website: next.website,
              addresses: next.addresses,
              socialMedia: next.socialMedia,
              minFloor: next.minFloor,
              maxFloor: next.maxFloor,
              excludedFloors: next.excludedFloors,
            });
            if (diff.length > 0) {
              changes.set(event.id, diff);
            }
          }
          accounts.set(id, next);
          break;
        }
        case "account.deleted": {
          const id = tryResolveEntityId(event, payload);
          if (id) accounts.delete(id);
          break;
        }
        case "organization.created": {
          const id = tryResolveEntityId(event, payload);
          if (!id) break;
          organizations.set(
            id,
            buildOrganizationState(id, payload, event.timestamp),
          );
          break;
        }
        case "organization.status.updated": {
          const id = tryResolveEntityId(event, payload);
          if (!id) break;
          const existing = id ? organizations.get(id) : undefined;
          if (!existing || !isOrganizationStatus(payload.status)) break;
          organizations.set(id, {
            ...existing,
            status: payload.status,
            updatedAt: event.timestamp,
          });
          break;
        }
        case "organization.updated": {
          const id = tryResolveEntityId(event, payload);
          if (!id) break;
          const existing = organizations.get(id);
          const next = buildOrganizationState(
            id,
            payload,
            event.timestamp,
            existing,
          );
          if (existing) {
            const diff = detectOrganizationChanges(existing, {
              name: next.name,
              status: next.status,
              website: next.website,
              socialMedia: next.socialMedia,
            });
            if (diff.length > 0) {
              changes.set(event.id, diff);
            }
          }
          organizations.set(id, next);
          break;
        }
        case "organization.deleted": {
          const id = tryResolveEntityId(event, payload);
          if (id) organizations.delete(id);
          break;
        }
        case "note.created": {
          const id = tryResolveEntityId(event, payload);
          if (!id) break;
          notes.set(id, buildNoteState(id, payload, event.timestamp));
          break;
        }
        case "note.updated": {
          const id = tryResolveEntityId(event, payload);
          if (!id) break;
          const existing = notes.get(id);
          const next = buildNoteState(id, payload, event.timestamp, existing);
          if (existing) {
            const diff = detectNoteChanges(existing, {
              title: next.title,
              body: next.body,
            });
            if (diff.length > 0) {
              changes.set(event.id, diff);
            }
          }
          notes.set(id, next);
          break;
        }
        case "note.deleted": {
          const id = tryResolveEntityId(event, payload);
          if (id) notes.delete(id);
          break;
        }
        case "interaction.logged": {
          const id = tryResolveEntityId(event, payload);
          if (!id) break;
          interactions.set(
            id,
            buildInteractionState(id, payload, event.timestamp),
          );
          break;
        }
        case "interaction.scheduled": {
          const id = tryResolveEntityId(event, payload);
          if (!id) break;
          interactions.set(
            id,
            buildInteractionState(id, payload, event.timestamp),
          );
          break;
        }
        case "interaction.rescheduled": {
          const id = tryResolveEntityId(event, payload);
          if (!id) break;
          const existing = interactions.get(id);
          const next = buildInteractionState(
            id,
            payload,
            event.timestamp,
            existing,
          );
          interactions.set(id, next);
          break;
        }
        case "interaction.status.updated": {
          const id = tryResolveEntityId(event, payload);
          if (!id) break;
          const existing = interactions.get(id);
          const next = buildInteractionState(
            id,
            payload,
            event.timestamp,
            existing,
          );
          interactions.set(id, next);
          break;
        }
        case "interaction.updated": {
          const id = tryResolveEntityId(event, payload);
          if (!id) break;
          const existing = interactions.get(id);
          const next = buildInteractionState(
            id,
            payload,
            event.timestamp,
            existing,
          );
          if (existing) {
            const diff = detectInteractionChanges(existing, {
              type: next.type,
              summary: next.summary,
              occurredAt: next.occurredAt,
            });
            if (diff.length > 0) {
              changes.set(event.id, diff);
            }
          }
          interactions.set(id, next);
          break;
        }
        case "interaction.deleted": {
          const id = tryResolveEntityId(event, payload);
          if (id) interactions.delete(id);
          break;
        }
        default:
          break;
      }
    }

    return changes;
  }, [timeline]);

  const getChangesForItem = (item: TimelineItem): FieldChange[] | undefined =>
    item.kind === "event" ? changesByEventId.get(item.event.id) : undefined;

  const getEventContext = (item: TimelineItem): string | null => {
    if (item.kind !== "event") return null;

    const payload = item.event.payload as Record<string, unknown>;
    const resolveLinkedEntity = (
      entityType: string | null,
      entityId: string | null,
    ): string | null => {
      if (!entityType || !entityId) {
        return null;
      }

      let entityName = t("common.unknown");

      if (entityType === "organization") {
        const org = doc.organizations[entityId];
        entityName = org?.name || t("common.unknown");
      } else if (entityType === "account") {
        const account = doc.accounts[entityId];
        entityName = account?.name || t("common.unknown");
      } else if (entityType === "audit") {
        const audit = doc.audits[entityId];
        const stamp = audit?.occurredAt ?? audit?.scheduledFor ?? audit?.id;
        entityName = stamp ? `Audit ${stamp}` : t("common.unknown");
      } else if (entityType === "contact") {
        const contact = doc.contacts[entityId];
        entityName = contact ? getContactName(contact) : t("common.unknown");
      }

      if (!entityName) {
        return null;
      }

      const displayType =
        entityType.charAt(0).toUpperCase() + entityType.slice(1);
      return `${displayType}: ${entityName}`;
    };

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

    // For note link events
    if (
      item.event.type === "note.linked" ||
      item.event.type === "note.unlinked"
    ) {
      const entityType =
        typeof payload?.entityType === "string" ? payload.entityType : null;
      const entityId =
        typeof payload?.entityId === "string" ? payload.entityId : null;

      return resolveLinkedEntity(entityType, entityId);
    }

    if (
      item.event.type === "interaction.logged" ||
      item.event.type === "interaction.scheduled"
    ) {
      if (typeof payload?.summary === "string" && payload.summary.trim()) {
        return payload.summary;
      }
    }

    // For interaction link events
    if (
      item.event.type === "interaction.linked" ||
      item.event.type === "interaction.unlinked"
    ) {
      const interactionId =
        typeof payload?.interactionId === "string"
          ? payload.interactionId
          : null;
      const entityType =
        typeof payload?.entityType === "string" ? payload.entityType : null;
      const entityId =
        typeof payload?.entityId === "string" ? payload.entityId : null;

      const entityContext = resolveLinkedEntity(entityType, entityId);
      let interactionSummary: string | null = null;

      if (interactionId) {
        const interaction = doc.interactions[interactionId];
        if (interaction?.summary) {
          interactionSummary = interaction.summary;
        }
      }

      if (entityContext && interactionSummary) {
        return `${entityContext} • ${interactionSummary}`;
      }

      return entityContext ?? interactionSummary;
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

      // Compute field changes at render time for update events
      const changes = getChangesForItem(item);

      // If this is an update event with changes, enhance the label with field names
      if (
        changes &&
        changes.length > 0 &&
        (item.event.type === "contact.updated" ||
          item.event.type === "account.updated" ||
          item.event.type === "organization.updated" ||
          item.event.type === "note.updated" ||
          item.event.type === "interaction.updated")
      ) {
        const capitalizeField = (field: string) => {
          // Handle camelCase fields
          return field
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase())
            .trim();
        };
        const fieldNames = changes
          .map((c) => capitalizeField(c.field))
          .join(", ");
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
                  // Helper to translate values that look like i18n keys
                  const translateIfKey = (value: string) => {
                    if (value.includes(".")) {
                      // Looks like an i18n key, try to translate it
                      const translated = t(value);
                      return translated !== value ? translated : value;
                    }
                    return value;
                  };

                  // Format the change display based on whether it's an add/remove/update
                  let displayText = "";
                  if (change.oldValue === "" && change.newValue !== "") {
                    // Added
                    displayText = `+ ${translateIfKey(change.newValue)}`;
                  } else if (change.oldValue !== "" && change.newValue === "") {
                    // Removed
                    displayText = `- ${translateIfKey(change.oldValue)}`;
                  } else {
                    // Updated
                    displayText = `${translateIfKey(change.oldValue)} → ${translateIfKey(change.newValue)}`;
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
              {t("events.interaction.logged")}: {t(item.interaction.type)}
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
