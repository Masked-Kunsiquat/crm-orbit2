import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const eventLog = sqliteTable("event_log", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  entityId: text("entity_id"),
  payload: text("payload").notNull(),
  timestamp: text("timestamp").notNull(),
  deviceId: text("device_id").notNull(),
});

export const automergeSnapshots = sqliteTable("automerge_snapshots", {
  id: text("id").primaryKey(),
  doc: text("doc").notNull(),
  timestamp: text("timestamp").notNull(),
});

export const calendarEventExternalLinks = sqliteTable(
  "calendar_event_external_links",
  {
    id: text("id").primaryKey(),
    calendarEventId: text("calendar_event_id").notNull(),
    provider: text("provider").notNull(),
    calendarId: text("calendar_id").notNull(),
    externalEventId: text("external_event_id").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    lastSyncedAt: text("last_synced_at"),
    lastExternalModifiedAt: text("last_external_modified_at"),
  },
);
