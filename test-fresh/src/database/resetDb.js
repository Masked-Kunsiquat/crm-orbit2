// Database reset utility for development
import * as SQLite from 'expo-sqlite';

/**
 * Delete the database file and reset the app state.
 * This is a development-only utility.
 *
 * IMPORTANT: This function expects to receive the currently open database instance
 * from the caller. It will close the instance before deleting the database file.
 *
 * @param {object} db - The currently open database instance (from database.getDB())
 * @param {string} dbName - Name of the database file
 * @returns {Promise<boolean>}
 */
export async function resetDatabase(db, dbName = 'crm_orbit.db') {
  try {
    console.log('[resetDatabase] Starting reset...');

    // Close the provided database connection
    if (db && typeof db.closeAsync === 'function') {
      console.log('[resetDatabase] Closing database connection...');
      await db.closeAsync();
      console.log('[resetDatabase] Database connection closed.');
    } else {
      console.warn('[resetDatabase] No valid database instance provided or closeAsync not available');
    }

    // Delete the database using SQLite's deleteDatabaseAsync
    console.log(`[resetDatabase] Deleting database file: ${dbName}`);
    await SQLite.deleteDatabaseAsync(dbName);
    console.log('[resetDatabase] Database file deleted successfully.');

    console.log('[resetDatabase] Reset complete. IMPORTANT: You MUST restart the app manually for changes to take effect!');
    return true;
  } catch (error) {
    console.error('[resetDatabase] Error during reset:', error);
    console.error('[resetDatabase] Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    throw error;
  }
}
