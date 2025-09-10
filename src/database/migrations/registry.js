// Migration registry
// Import migration modules here and export as an ordered array.
// This pattern works reliably with Metro/Expo bundlers.

import { DatabaseError } from '../errors';
import m001 from './001_initial_schema';
import m002 from './002_seed_data';

const MIGRATIONS = [
  m001,
  m002,
];

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
      'MIGRATION_ENTRY_INVALID'
    );
  }
  if (seen.has(m.version)) {
    throw new DatabaseError(
      `Duplicate migration version detected: ${m.version}`,
      'MIGRATION_DUPLICATE'
    );
  }
  seen.add(m.version);
});

const SORTED = Object.freeze([...MIGRATIONS].sort((a, b) => a.version - b.version));
export default SORTED;
