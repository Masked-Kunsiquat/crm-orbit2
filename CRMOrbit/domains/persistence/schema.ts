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

export const appMetadata = sqliteTable("app_metadata", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
