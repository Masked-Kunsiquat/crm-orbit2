import type { AutomergeDoc } from "@automerge/schema";
import type { Audit } from "@domains/audit";
import type { Interaction } from "@domains/interaction";
import type { Account } from "@domains/account";
import { formatAddressForMaps } from "@domains/linking.utils";
import {
  formatAuditScore,
  getAuditEndTimestamp,
  getAuditStartTimestamp,
  resolveAuditStatus,
} from "./audits";
import { addMinutesToTimestamp } from "./duration";
import type { CalendarSyncEvent } from "./deviceCalendar";
import { getEntitiesForInteraction } from "../store/selectors";

/**
 * Converts a timestamp string to a Date object, or returns null if invalid.
 */
const toDateOrNull = (timestamp?: string): Date | null => {
  if (!timestamp) return null;
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
};

/**
 * Builds a calendar event title, prefixing with "Canceled" if applicable.
 */
const buildCalendarTitle = (
  title: string,
  isCanceled: boolean,
  canceledPrefix: string,
): string => {
  if (!isCanceled) {
    return title;
  }
  return `${canceledPrefix} - ${title}`;
};

export type AuditCalendarLabels = {
  canceledPrefix: string;
  eventTypeLabel: string;
  unknownEntityLabel: string;
  statusLabel: string;
  statusValue: string;
  parkingAddressLabel: string;
  scoreLabel: string;
  floorsVisitedLabel: string;
  notesLabel: string;
};

export type InteractionCalendarLabels = {
  canceledPrefix: string;
  unknownEntityLabel: string;
  statusLabel: string;
  statusValue?: string | null;
};

/**
 * Builds notes for an audit calendar event.
 * Includes status, parking address, score, floors visited, and audit notes.
 */
const buildAuditNotes = (
  audit: Audit,
  labels: AuditCalendarLabels,
  parkingAddress?: string,
): string | undefined => {
  const lines: string[] = [];
  lines.push(`${labels.statusLabel}: ${labels.statusValue}`);
  if (parkingAddress) {
    lines.push(`${labels.parkingAddressLabel}: ${parkingAddress}`);
  }
  const scoreValue = formatAuditScore(audit.score);
  if (scoreValue) {
    lines.push(`${labels.scoreLabel}: ${scoreValue}`);
  }
  if (audit.floorsVisited && audit.floorsVisited.length > 0) {
    lines.push(
      `${labels.floorsVisitedLabel}: ${audit.floorsVisited.join(", ")}`,
    );
  }
  if (audit.notes?.trim()) {
    lines.push(`${labels.notesLabel}: ${audit.notes.trim()}`);
  }
  return lines.length > 0 ? lines.join("\n") : undefined;
};

/**
 * Builds notes for an interaction calendar event.
 * Includes status and summary if present.
 */
const buildInteractionNotes = (
  interaction: Interaction,
  labels: InteractionCalendarLabels,
): string | undefined => {
  const lines: string[] = [];
  if (labels.statusValue) {
    lines.push(`${labels.statusLabel}: ${labels.statusValue}`);
  }
  if (interaction.summary?.trim()) {
    lines.push(interaction.summary.trim());
  }
  return lines.length > 0 ? lines.join("\n") : undefined;
};

/**
 * Builds a calendar event for an audit.
 *
 * @param audit - The audit entity
 * @param account - The associated account (optional, falls back to "Unknown")
 * @param alarmOffsetMinutes - Minutes before event to trigger alarm (0 = no alarm)
 * @param labels - Pre-localized labels for calendar content
 * @returns CalendarSyncEvent or null if audit has no valid start date
 */
export const buildAuditCalendarEvent = (
  audit: Audit,
  account: Account | undefined,
  alarmOffsetMinutes: number,
  labels: AuditCalendarLabels,
): CalendarSyncEvent | null => {
  const status = resolveAuditStatus(audit);
  const isCanceled = status === "audits.status.canceled";
  const accountName = account?.name ?? labels.unknownEntityLabel;

  // Determine location and parking note
  const siteAddress = account?.addresses?.site;
  const parkingAddress = account?.addresses?.useSameForParking
    ? account?.addresses?.site
    : account?.addresses?.parking;
  const siteAddressText = siteAddress
    ? formatAddressForMaps(siteAddress)
    : undefined;
  const parkingAddressText = parkingAddress
    ? formatAddressForMaps(parkingAddress)
    : undefined;
  const location = siteAddressText ?? parkingAddressText;
  const parkingNote =
    parkingAddressText && parkingAddressText !== location
      ? parkingAddressText
      : undefined;

  // Determine start/end dates
  const startTimestamp = getAuditStartTimestamp(audit);
  const startDate = toDateOrNull(startTimestamp);
  if (!startDate) return null;

  const endTimestamp = getAuditEndTimestamp(audit) ?? startTimestamp;
  const endDate = toDateOrNull(endTimestamp) ?? startDate;

  // Determine alarms
  const alarmOffset =
    !isCanceled && alarmOffsetMinutes > 0
      ? [{ relativeOffset: -alarmOffsetMinutes }]
      : [];

  return {
    key: `audit:${audit.id}`,
    title: buildCalendarTitle(
      `${accountName} - ${labels.eventTypeLabel}`,
      isCanceled,
      labels.canceledPrefix,
    ),
    startDate,
    endDate,
    location,
    notes: buildAuditNotes(audit, labels, parkingNote),
    alarms: alarmOffset,
  };
};

/**
 * Builds a calendar event for an interaction.
 *
 * @param interaction - The interaction entity
 * @param doc - The CRM document (used to resolve linked entities)
 * @param labels - Pre-localized labels for calendar content
 * @returns CalendarSyncEvent or null if interaction has no valid start date
 */
export const buildInteractionCalendarEvent = (
  interaction: Interaction,
  doc: AutomergeDoc,
  labels: InteractionCalendarLabels,
): CalendarSyncEvent | null => {
  const isCanceled = interaction.status === "interaction.status.canceled";

  // Determine start date
  const timestamp =
    interaction.scheduledFor ?? interaction.occurredAt ?? undefined;
  const startDate = toDateOrNull(timestamp);
  if (!startDate) return null;

  // Determine end date
  const endTimestamp = addMinutesToTimestamp(
    timestamp,
    interaction.durationMinutes,
  );
  const endDate = toDateOrNull(endTimestamp) ?? startDate;

  // Resolve account name from linked entities
  const linkedEntities = getEntitiesForInteraction(doc, interaction.id);
  const accountEntity =
    linkedEntities.find((entity) => entity.entityType === "account") ??
    linkedEntities[0];
  const accountName = accountEntity?.name ?? labels.unknownEntityLabel;

  return {
    key: `interaction:${interaction.id}`,
    title: buildCalendarTitle(
      `${accountName} - ${interaction.type}`,
      isCanceled,
      labels.canceledPrefix,
    ),
    startDate,
    endDate,
    notes: buildInteractionNotes(interaction, labels),
  };
};

/**
 * Builds all calendar events from audits and interactions.
 *
 * @param audits - All audits in the CRM
 * @param interactions - All interactions in the CRM
 * @param accountMap - Map of account IDs to accounts
 * @param doc - The CRM document
 * @param auditAlarmOffsetMinutes - Alarm offset for audit events
 * @param labels - Label builders for calendar content
 * @returns Array of calendar sync events
 */
export const buildAllCalendarEvents = (
  audits: Audit[],
  interactions: Interaction[],
  accountMap: Map<string, Account>,
  doc: AutomergeDoc,
  auditAlarmOffsetMinutes: number,
  labels: {
    audit: (audit: Audit) => AuditCalendarLabels;
    interaction: (interaction: Interaction) => InteractionCalendarLabels;
  },
): CalendarSyncEvent[] => {
  const events: CalendarSyncEvent[] = [];

  // Build audit events
  for (const audit of audits) {
    const account = accountMap.get(audit.accountId);
    const auditLabels = labels.audit(audit);
    const event = buildAuditCalendarEvent(
      audit,
      account,
      auditAlarmOffsetMinutes,
      auditLabels,
    );
    if (event) {
      events.push(event);
    }
  }

  // Build interaction events
  for (const interaction of interactions) {
    const interactionLabels = labels.interaction(interaction);
    const event = buildInteractionCalendarEvent(
      interaction,
      doc,
      interactionLabels,
    );
    if (event) {
      events.push(event);
    }
  }

  return events;
};
