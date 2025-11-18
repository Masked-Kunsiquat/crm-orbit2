// Database reset utility for development
import * as SQLite from 'expo-sqlite';

/**
 * Delete the database file and reset the app state.
 * This is a development-only utility.
 */
export async function resetDatabase(dbName = 'crm_orbit.db') {
  try {
    console.log('Resetting database...');

    // Close and delete using SQLite's built-in method
    const db = await SQLite.openDatabaseAsync(dbName);

    // Close the database connection
    await db.closeAsync();

    // Delete the database using SQLite's deleteDatabaseAsync
    await SQLite.deleteDatabaseAsync(dbName);

    console.log('Database reset complete. Restart the app to recreate.');
    return true;
  } catch (error) {
    console.error('Error resetting database:', error);
    throw error;
  }
}
