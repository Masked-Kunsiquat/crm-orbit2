export const MIGRATIONS: string[] = [
  `create table if not exists event_log (
    id text primary key,
    type text not null,
    entity_id text,
    payload text not null,
    timestamp text not null,
    device_id text not null
  );`,
  `create table if not exists automerge_snapshots (
    id text primary key,
    doc text not null,
    timestamp text not null
  );`,
  `create table if not exists app_metadata (
    key text primary key,
    value text not null
  );`,
];

export type MigrationDb = {
  execute: (sql: string) => Promise<void>;
};

export const runMigrations = async (db: MigrationDb): Promise<void> => {
  for (const sql of MIGRATIONS) {
    await db.execute(sql);
  }
};
