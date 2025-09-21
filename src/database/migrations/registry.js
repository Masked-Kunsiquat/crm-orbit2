// Migration registry
// Import migration modules here and export as an ordered array.
// This pattern works reliably with Metro/Expo bundlers.

import { DatabaseError } from '../errors.js';
import m001 from './001_initial_schema.js';
import m002 from './002_seed_data.js';
import m003 from './003_performance_indexes.js';
import m004 from './004_add_display_name_column.js';

const MIGRATIONS = [m001, m002, m003, m004];

// Ensure unique, sorted by version
const seen = new Set();
MIGRATIONS.forEach((m, idx) => {
  if (!m || !Number.isInteger(m.version)) {
    throw new DatabaseError(
      'Invalid migration entry: missing integer version',
      'MIGRATION_ENTRY_INVALID',
      null,
      { entry: m, index: idx }
    );
  }
  if (
    typeof m.name !== 'string' ||
    typeof m.up !== 'function' ||
    typeof m.down !== 'function'
  ) {
    throw new DatabaseError(
      `Invalid migration entry for version ${m?.version}: require { name, up, down }`,
      'MIGRATION_ENTRY_INVALID',
      null,
      { entry: m }
    );
  }
  if (seen.has(m.version)) {
    throw new DatabaseError(
      `Duplicate migration version detected: ${m.version}`,
      'MIGRATION_DUPLICATE',
      null,
      { version: m.version }
    );
  }
  seen.add(m.version);
});

const SORTED = Object.freeze(
  [...MIGRATIONS].sort((a, b) => a.version - b.version)
);
export default SORTED;
