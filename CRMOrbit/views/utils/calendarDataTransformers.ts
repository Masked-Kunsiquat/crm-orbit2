import type { Audit } from "@domains/audit";
import type { Interaction } from "@domains/interaction";
import type { MarkedDates } from "react-native-calendars/src/types";
import { t } from "@i18n/index";
import {
  formatAuditScore,
  getAuditEndTimestamp,
  getAuditStartTimestamp,
  getAuditStatusTone,
  resolveAuditStatus,
} from "./audits";
import { addMinutesToTimestamp } from "./duration";

/**
 * Converts a timestamp string to ISO date format (YYYY-MM-DD)
 */
const toISODate = (timestamp?: string): string | null => {
  if (!timestamp) return null;
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return null;
  const date = new Date(parsed);
  return date.toISOString().split("T")[0];
};

/**
 * Formats timestamp for display in agenda items
 */
const formatTimestamp = (timestamp?: string): string => {
  if (!timestamp) return t("common.unknown");
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return t("common.unknown");
  return date.toLocaleString();
};

/**
 * AgendaList section item for an audit
 */
export interface AuditAgendaItem {
  kind: "audit";
  id: string;
  audit: Audit;
  accountName: string;
  startTime: string;
  endTime?: string;
  subtitle: string;
  description?: string;
  footnote?: string;
  statusTone: "positive" | "neutral" | "warning" | "destructive";
  statusKey: string;
}

/**
 * AgendaList section item for an interaction
 */
export interface InteractionAgendaItem {
  kind: "interaction";
  id: string;
  interaction: Interaction;
  entityName: string;
  startTime: string;
  endTime?: string;
  subtitle: string;
  description?: string;
}

/**
 * Union type for agenda items
 */
export type AgendaItem = AuditAgendaItem | InteractionAgendaItem;

/**
 * AgendaList section format
 */
export interface AgendaSection {
  title: string; // ISO date (YYYY-MM-DD)
  data: AgendaItem[];
}

/**
 * Builds an agenda item for an audit
 */
export const buildAuditAgendaItem = (
  audit: Audit,
  accountName: string,
): AuditAgendaItem | null => {
  const status = resolveAuditStatus(audit);
  const startTimestamp = getAuditStartTimestamp(audit);
  if (!startTimestamp) return null;

  const endTimestamp = getAuditEndTimestamp(audit);
  const scoreValue = formatAuditScore(audit.score);
  const scoreLabel = scoreValue
    ? `${t("audits.fields.score")}: ${scoreValue}`
    : undefined;
  const floorsLabel =
    audit.floorsVisited && audit.floorsVisited.length > 0
      ? `${t("audits.fields.floorsVisited")}: ${audit.floorsVisited.join(", ")}`
      : undefined;
  const footnote = audit.notes?.trim() || floorsLabel;

  const descriptionLines = [
    endTimestamp
      ? `${t("audits.fields.endsAt")}: ${formatTimestamp(endTimestamp)}`
      : undefined,
    scoreLabel,
  ].filter(Boolean);

  return {
    kind: "audit",
    id: audit.id,
    audit,
    accountName,
    startTime: formatTimestamp(startTimestamp),
    endTime: endTimestamp ? formatTimestamp(endTimestamp) : undefined,
    subtitle: `${t("audits.fields.scheduledFor")}: ${formatTimestamp(startTimestamp)}`,
    description: descriptionLines.length
      ? descriptionLines.join("\n")
      : undefined,
    footnote,
    statusTone: getAuditStatusTone(status),
    statusKey: status,
  };
};

/**
 * Builds an agenda item for an interaction
 */
export const buildInteractionAgendaItem = (
  interaction: Interaction,
  entityName: string,
): InteractionAgendaItem | null => {
  const resolvedStatus = interaction.status ?? "interaction.status.completed";
  const usesScheduledTimestamp =
    resolvedStatus !== "interaction.status.completed";
  const timestampValue = usesScheduledTimestamp
    ? (interaction.scheduledFor ?? interaction.occurredAt)
    : interaction.occurredAt;

  if (!timestampValue) return null;

  const labelKey = usesScheduledTimestamp
    ? "interactions.scheduledFor"
    : "interactions.occurredAt";
  const formattedTimestamp = formatTimestamp(timestampValue);
  const endTimestamp = addMinutesToTimestamp(
    timestampValue,
    interaction.durationMinutes,
  );

  const descriptionLines = [
    resolvedStatus !== "interaction.status.completed"
      ? `${t("interactions.statusLabel")}: ${t(resolvedStatus)}`
      : undefined,
    endTimestamp
      ? `${t("interactions.fields.endsAt")}: ${formatTimestamp(endTimestamp)}`
      : undefined,
  ].filter(Boolean);

  return {
    kind: "interaction",
    id: interaction.id,
    interaction,
    entityName,
    startTime: formattedTimestamp,
    endTime: endTimestamp ? formatTimestamp(endTimestamp) : undefined,
    subtitle: `${t(labelKey)}: ${formattedTimestamp}`,
    description: descriptionLines.length
      ? descriptionLines.join("\n")
      : undefined,
  };
};

/**
 * Groups agenda items by date into sections for AgendaList
 */
export const groupAgendaItemsByDate = (
  items: AgendaItem[],
): AgendaSection[] => {
  const itemsByDate = new Map<string, AgendaItem[]>();

  for (const item of items) {
    let timestamp: string | undefined;
    if (item.kind === "audit") {
      timestamp = getAuditStartTimestamp(item.audit);
    } else {
      const resolvedStatus =
        item.interaction.status ?? "interaction.status.completed";
      const usesScheduledTimestamp =
        resolvedStatus !== "interaction.status.completed";
      timestamp = usesScheduledTimestamp
        ? (item.interaction.scheduledFor ?? item.interaction.occurredAt)
        : item.interaction.occurredAt;
    }

    const dateKey = toISODate(timestamp);
    if (!dateKey) continue;

    const existing = itemsByDate.get(dateKey) ?? [];
    existing.push(item);
    itemsByDate.set(dateKey, existing);
  }

  // Convert to sections array and sort by date (most recent first)
  const sections = Array.from(itemsByDate.entries())
    .map(([title, data]) => ({ title, data }))
    .sort((a, b) => b.title.localeCompare(a.title));

  return sections;
};

/**
 * Builds marked dates object for calendar visualization
 * Uses multi-dot marking to show different event types
 */
export const buildMarkedDates = (
  audits: Audit[],
  interactions: Interaction[],
  selectedDate?: string,
): MarkedDates => {
  const marked: MarkedDates = {};

  // Mark dates with audits (blue dot)
  for (const audit of audits) {
    const timestamp = getAuditStartTimestamp(audit);
    const dateKey = toISODate(timestamp);
    if (!dateKey) continue;

    const status = resolveAuditStatus(audit);
    const isCanceled = status === "audits.status.canceled";
    const isCompleted = status === "audits.status.completed";

    if (!marked[dateKey]) {
      marked[dateKey] = { dots: [] };
    }

    // Use different colors based on status
    const color = isCanceled ? "#999" : isCompleted ? "#4CAF50" : "#2196F3";
    marked[dateKey].dots = marked[dateKey].dots || [];
    marked[dateKey].dots!.push({
      key: `audit-${audit.id}`,
      color,
    });
  }

  // Mark dates with interactions (orange dot)
  for (const interaction of interactions) {
    const resolvedStatus = interaction.status ?? "interaction.status.completed";
    const usesScheduledTimestamp =
      resolvedStatus !== "interaction.status.completed";
    const timestamp = usesScheduledTimestamp
      ? (interaction.scheduledFor ?? interaction.occurredAt)
      : interaction.occurredAt;
    const dateKey = toISODate(timestamp);
    if (!dateKey) continue;

    const isCanceled = resolvedStatus === "interaction.status.canceled";
    const isCompleted = resolvedStatus === "interaction.status.completed";

    if (!marked[dateKey]) {
      marked[dateKey] = { dots: [] };
    }

    // Use different colors based on status
    const color = isCanceled ? "#999" : isCompleted ? "#4CAF50" : "#FF9800";
    marked[dateKey].dots = marked[dateKey].dots || [];
    marked[dateKey].dots!.push({
      key: `interaction-${interaction.id}`,
      color,
    });
  }

  // Mark selected date
  if (selectedDate && marked[selectedDate]) {
    marked[selectedDate].selected = true;
    marked[selectedDate].selectedColor = "#00adf5";
  } else if (selectedDate) {
    marked[selectedDate] = {
      selected: true,
      selectedColor: "#00adf5",
    };
  }

  return marked;
};

/**
 * Gets the most recent date with events, or today's date
 */
export const getInitialCalendarDate = (
  audits: Audit[],
  interactions: Interaction[],
): string => {
  const today = new Date();
  const todayISO = today.toISOString().split("T")[0];

  const dates: string[] = [];

  for (const audit of audits) {
    const timestamp = getAuditStartTimestamp(audit);
    const dateKey = toISODate(timestamp);
    if (dateKey) dates.push(dateKey);
  }

  for (const interaction of interactions) {
    const resolvedStatus = interaction.status ?? "interaction.status.completed";
    const usesScheduledTimestamp =
      resolvedStatus !== "interaction.status.completed";
    const timestamp = usesScheduledTimestamp
      ? (interaction.scheduledFor ?? interaction.occurredAt)
      : interaction.occurredAt;
    const dateKey = toISODate(timestamp);
    if (dateKey) dates.push(dateKey);
  }

  if (dates.length === 0) return todayISO;

  // Find the most recent date (closest to today)
  dates.sort((a, b) => b.localeCompare(a));
  return dates[0];
};
