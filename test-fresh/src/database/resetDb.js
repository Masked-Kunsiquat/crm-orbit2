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
    console.log('Resetting database...');

    // Close the provided database connection
    if (db && typeof db.closeAsync === 'function') {
      await db.closeAsync();
      console.log('Database connection closed.');
    }

    // Delete the database using SQLite's deleteDatabaseAsync
    await SQLite.deleteDatabaseAsync(dbName);

    console.log('Database reset complete. Restart the app to recreate.');
    return true;
  } catch (error) {
    console.error('Error resetting database:', error);
    throw error;
  }
}
