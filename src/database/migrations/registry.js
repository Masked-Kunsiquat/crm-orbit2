// Migration registry
// Import migration modules here and export as an ordered array.
// This pattern works reliably with Metro/Expo bundlers.

import m001 from './001_initial_schema';

// Add future migrations below, e.g.:
// import m002 from './002_seed_data';

const MIGRATIONS = [
  m001,
  // m002,
];

// Ensure unique, sorted by version
const seen = new Set();
MIGRATIONS.forEach((m) => {
  if (!m || typeof m.version !== 'number') {
    throw new Error('Invalid migration entry: missing numeric version');
  }
  if (seen.has(m.version)) {
    throw new Error(`Duplicate migration version detected: ${m.version}`);
  }
  seen.add(m.version);
});

MIGRATIONS.sort((a, b) => a.version - b.version);

export default MIGRATIONS;

