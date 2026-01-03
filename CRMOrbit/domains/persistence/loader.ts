import type { AutomergeDoc } from "@automerge/schema";
import type { EntityLinkType } from "@domains/relations/entityLink";
import { applyEvents } from "@events/dispatcher";
import type { Event } from "@events/event";
import type { PersistenceDb, EventLogRecord } from "./store";
import { loadLatestSnapshot } from "./store";
import { eventLog } from "./schema";

const EMPTY_DOC: AutomergeDoc = {
  organizations: {},
  accounts: {},
  contacts: {},
  notes: {},
  interactions: {},
  relations: {
    accountContacts: {},
    entityLinks: {},
  },
};

const normalizeSnapshot = (doc: AutomergeDoc): AutomergeDoc => {
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
    relations: {
      ...doc.relations,
      entityLinks: mergedLinks,
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

  // Parse events from records
  const events: Event[] = eventRecords.map((record) => ({
    id: record.id,
    type: record.type as Event["type"],
    entityId: record.entityId ?? undefined,
    payload: JSON.parse(record.payload),
    timestamp: record.timestamp,
    deviceId: record.deviceId,
  }));

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

  return { doc, events };
};
