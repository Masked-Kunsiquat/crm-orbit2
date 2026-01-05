import type { AutomergeDoc } from "@automerge/schema";
import type { EntityLinkType } from "@domains/relations/entityLink";
import { DEFAULT_SETTINGS } from "@domains/settings";
import { applyEvents } from "@events/dispatcher";
import type { Event } from "@events/event";
import type { PersistenceDb, EventLogRecord } from "./store";
import { loadLatestSnapshot } from "./store";
import { eventLog } from "./schema";
import { createLogger, silenceLogs, unsilenceLogs } from "@utils/logger";

const logger = createLogger("PersistenceLoader");

const EMPTY_DOC: AutomergeDoc = {
  organizations: {},
  accounts: {},
  audits: {},
  contacts: {},
  notes: {},
  interactions: {},
  codes: {},
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

  const normalizedAudits = Object.fromEntries(
    Object.entries(existingAudits).map(([id, audit]) => {
      const durationMinutes =
        Number.isInteger(audit.durationMinutes) && audit.durationMinutes > 0
          ? audit.durationMinutes
          : DEFAULT_AUDIT_DURATION_MINUTES;
      const status =
        audit.status ??
        (audit.occurredAt
          ? "audits.status.completed"
          : "audits.status.scheduled");
      return [
        id,
        {
          ...audit,
          durationMinutes,
          status,
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

  return {
    ...doc,
    codes: normalizedCodes,
    audits: normalizedAudits,
    settings: doc.settings ?? DEFAULT_SETTINGS,
    relations: {
      ...doc.relations,
      entityLinks: mergedLinks,
      accountCodes: existingAccountCodes,
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
  const events: Event[] = eventRecords.map((record) => ({
    id: record.id,
    type: record.type as Event["type"],
    entityId: record.entityId ?? undefined,
    payload: JSON.parse(record.payload),
    timestamp: record.timestamp,
    deviceId: record.deviceId,
  }));

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
    `State reconstructed: ${Object.keys(doc.organizations).length} orgs, ${Object.keys(doc.accounts).length} accounts, ${Object.keys(doc.audits).length} audits, ${Object.keys(doc.contacts).length} contacts, ${Object.keys(doc.notes).length} notes, ${Object.keys(doc.interactions).length} interactions, ${Object.keys(doc.codes).length} codes`,
  );

  return { doc, events };
};
