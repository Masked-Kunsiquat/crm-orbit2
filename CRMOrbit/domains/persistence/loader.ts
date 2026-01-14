import type { AutomergeDoc } from "@automerge/schema";
import type { EntityLinkType } from "@domains/relations/entityLink";
import {
  DEFAULT_CALENDAR_SETTINGS,
  DEFAULT_SECURITY_SETTINGS,
  DEFAULT_SETTINGS,
  isCalendarPaletteId,
} from "@domains/settings";
import {
  DEFAULT_ACCOUNT_AUDIT_FREQUENCY,
  getMonthStartTimestamp,
  isAccountAuditFrequency,
  resolveAccountAuditFrequency,
} from "@domains/account.utils";
import { applyEvents } from "@events/dispatcher";
import type { Event } from "@events/event";
import { sortEvents } from "@events/ordering";
import type { PersistenceDb, EventLogRecord } from "./store";
import { loadLatestSnapshot } from "./store";
import { eventLog } from "./schema";
import { createLogger, silenceLogs, unsilenceLogs } from "@utils/logger";
import { runCalendarEventMigration } from "@domains/migrations/runMigration";

const logger = createLogger("PersistenceLoader");

const EMPTY_DOC: AutomergeDoc = {
  organizations: {},
  accounts: {},
  audits: {},
  contacts: {},
  notes: {},
  interactions: {},
  codes: {},
  calendarEvents: {},
  settings: DEFAULT_SETTINGS,
  relations: {
    accountContacts: {},
    accountCodes: {},
    entityLinks: {},
  },
};

const normalizeSnapshot = (doc: AutomergeDoc): AutomergeDoc => {
  const DEFAULT_AUDIT_DURATION_MINUTES = 60;
  const legacyLinks = (
    doc as {
      relations?: {
        noteLinks?: Record<
          string,
          { noteId: string; entityType: EntityLinkType; entityId: string }
        >;
      };
    }
  ).relations?.noteLinks;

  const existingLinks =
    doc.relations?.entityLinks ??
    ({} as AutomergeDoc["relations"]["entityLinks"]);
  const existingAccountCodes =
    doc.relations?.accountCodes ??
    ({} as AutomergeDoc["relations"]["accountCodes"]);
  const existingCodes = doc.codes ?? ({} as AutomergeDoc["codes"]);
  const existingAudits = doc.audits ?? ({} as AutomergeDoc["audits"]);
  const existingAccounts = doc.accounts ?? ({} as AutomergeDoc["accounts"]);
  const existingCalendarEvents =
    doc.calendarEvents ?? ({} as AutomergeDoc["calendarEvents"]);

  const normalizedAudits = Object.fromEntries(
    Object.entries(existingAudits).map(([id, audit]) => {
      const durationMinutes =
        Number.isInteger(audit.durationMinutes) && audit.durationMinutes > 0
          ? audit.durationMinutes
          : DEFAULT_AUDIT_DURATION_MINUTES;
      return [
        id,
        {
          ...audit,
          durationMinutes,
          status: audit.status,
        },
      ];
    }),
  ) as AutomergeDoc["audits"];

  const normalizedCodes = Object.fromEntries(
    Object.entries(existingCodes).map(([id, code]) => [
      id,
      {
        ...code,
        isEncrypted:
          typeof code.isEncrypted === "boolean" ? code.isEncrypted : false,
      },
    ]),
  ) as AutomergeDoc["codes"];

  const normalizedAccounts = Object.fromEntries(
    Object.entries(existingAccounts).map(([id, account]) => {
      const auditFrequency = resolveAccountAuditFrequency(
        account.auditFrequency ?? DEFAULT_ACCOUNT_AUDIT_FREQUENCY,
      );
      const auditFrequencyUpdatedAt =
        account.auditFrequencyUpdatedAt ??
        account.createdAt ??
        account.updatedAt ??
        "";
      const auditFrequencyAnchorAt =
        account.auditFrequencyAnchorAt ??
        getMonthStartTimestamp(auditFrequencyUpdatedAt) ??
        auditFrequencyUpdatedAt;
      const auditFrequencyPending = isAccountAuditFrequency(
        account.auditFrequencyPending,
      )
        ? account.auditFrequencyPending
        : undefined;
      const auditFrequencyPendingEffectiveAt =
        auditFrequencyPending && account.auditFrequencyPendingEffectiveAt
          ? account.auditFrequencyPendingEffectiveAt
          : undefined;

      return [
        id,
        {
          ...account,
          auditFrequency,
          auditFrequencyUpdatedAt,
          auditFrequencyAnchorAt,
          auditFrequencyPending,
          auditFrequencyPendingEffectiveAt,
        },
      ];
    }),
  ) as AutomergeDoc["accounts"];

  const mergedLinks = legacyLinks
    ? Object.entries(legacyLinks).reduce(
        (acc, [id, link]) => {
          if (!acc[id]) {
            acc[id] = {
              linkType: "note",
              noteId: link.noteId,
              entityType: link.entityType,
              entityId: link.entityId,
            };
          }
          return acc;
        },
        { ...existingLinks },
      )
    : existingLinks;

  const paletteValue = doc.settings?.calendar?.palette;
  const resolvedPalette = isCalendarPaletteId(paletteValue)
    ? paletteValue
    : DEFAULT_CALENDAR_SETTINGS.palette;
  const normalizedSettings = {
    security: doc.settings?.security ?? DEFAULT_SECURITY_SETTINGS,
    calendar: {
      ...DEFAULT_CALENDAR_SETTINGS,
      palette: resolvedPalette,
    },
  };

  return {
    ...doc,
    accounts: normalizedAccounts,
    codes: normalizedCodes,
    audits: normalizedAudits,
    calendarEvents: existingCalendarEvents,
    settings: normalizedSettings,
    relations: {
      ...doc.relations,
      entityLinks: mergedLinks,
      accountCodes: existingAccountCodes,
    },
  };
};

const normalizeCalendarEventStatus = (
  status: unknown,
):
  | "calendarEvent.status.scheduled"
  | "calendarEvent.status.completed"
  | "calendarEvent.status.canceled"
  | undefined => {
  if (status === "scheduled") {
    return "calendarEvent.status.scheduled";
  }
  if (status === "completed") {
    return "calendarEvent.status.completed";
  }
  if (status === "canceled") {
    return "calendarEvent.status.canceled";
  }
  if (
    status === "calendarEvent.status.scheduled" ||
    status === "calendarEvent.status.completed" ||
    status === "calendarEvent.status.canceled"
  ) {
    return status;
  }
  return undefined;
};

const normalizeLegacyEventPayload = (event: Event): Event => {
  if (event.type !== "calendarEvent.scheduled") {
    return event;
  }

  const payload = event.payload as Record<string, unknown> | null;
  if (!payload || typeof payload !== "object") {
    return event;
  }

  if (!("status" in payload)) {
    return event;
  }

  const normalizedStatus = normalizeCalendarEventStatus(payload.status);
  if (!normalizedStatus || normalizedStatus === payload.status) {
    return event;
  }

  return {
    ...event,
    payload: {
      ...payload,
      status: normalizedStatus,
    },
  };
};

/**
 * Load the CRM state from persistence.
 * Returns the reconstructed document and all events.
 */
export const loadPersistedState = async (
  db: PersistenceDb,
): Promise<{ doc: AutomergeDoc; events: Event[] }> => {
  // Load latest snapshot
  const snapshot = await loadLatestSnapshot(db);

  // Load all events
  const eventRecords = await db.select().from<EventLogRecord>(eventLog).all();
  logger.info(`Loaded ${eventRecords.length} event records from database`);

  // Parse events from records
  const parsedEvents: Event[] = eventRecords.map((record) =>
    normalizeLegacyEventPayload({
      id: record.id,
      type: record.type as Event["type"],
      entityId: record.entityId ?? undefined,
      payload: JSON.parse(record.payload),
      timestamp: record.timestamp,
      deviceId: record.deviceId,
    }),
  );
  const events = sortEvents(parsedEvents);

  // Silence logs during event replay to avoid log spam
  silenceLogs();

  // Start with snapshot or empty doc
  let doc: AutomergeDoc;
  if (snapshot) {
    doc = normalizeSnapshot(JSON.parse(snapshot.doc));
    // Filter events that came after the snapshot
    const relevantEvents = events.filter(
      (e) => e.timestamp > snapshot.timestamp,
    );
    if (relevantEvents.length > 0) {
      doc = applyEvents(doc, relevantEvents);
    }
  } else {
    // No snapshot, replay all events from empty doc
    doc = events.length > 0 ? applyEvents(EMPTY_DOC, events) : EMPTY_DOC;
  }

  // Re-enable logs after replay
  unsilenceLogs();

  // Log summary of what was loaded
  logger.info(
    `State reconstructed: ${Object.keys(doc.organizations).length} orgs, ${Object.keys(doc.accounts).length} accounts, ${Object.keys(doc.audits).length} audits, ${Object.keys(doc.contacts).length} contacts, ${Object.keys(doc.notes).length} notes, ${Object.keys(doc.interactions).length} interactions, ${Object.keys(doc.codes).length} codes, ${Object.keys(doc.calendarEvents).length} calendar events`,
  );

  // Run calendar event migration if needed
  try {
    const { doc: migratedDoc, report } = await runCalendarEventMigration(
      doc,
      db,
      "migration-system",
    );
    doc = migratedDoc;
    if (report.events.length > 0) {
      logger.info(
        `Migration persisted ${report.events.length} events to database`,
      );
      // Add migrated events to the events array so they're available to the app
      events.push(...report.events);
    }
  } catch (error) {
    logger.error("Calendar event migration failed:", error);
    // Don't throw - allow app to continue even if migration fails
    // The migration will be retried on next load
  }

  return { doc, events };
};
