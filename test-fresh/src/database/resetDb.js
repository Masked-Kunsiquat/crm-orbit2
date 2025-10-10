// Database reset utility for development
import * as FileSystem from 'expo-file-system';
import * as SQLite from 'expo-sqlite';

/**
 * Delete the database file and reset the app state.
 * This is a development-only utility.
 */
export async function resetDatabase(dbName = 'crm_orbit.db') {
  try {
    console.log('Resetting database...');

    // Close any existing database connection
    const db = await SQLite.openDatabaseAsync(dbName);
    await db.closeAsync();

    // Delete the database file
    const dbPath = `${FileSystem.documentDirectory}SQLite/${dbName}`;
    const fileInfo = await FileSystem.getInfoAsync(dbPath);

    if (fileInfo.exists) {
      await FileSystem.deleteAsync(dbPath, { idempotent: true });
      console.log('Database file deleted successfully');
    }

    // Also delete WAL and SHM files if they exist
    const walPath = `${dbPath}-wal`;
    const shmPath = `${dbPath}-shm`;

    const walInfo = await FileSystem.getInfoAsync(walPath);
    if (walInfo.exists) {
      await FileSystem.deleteAsync(walPath, { idempotent: true });
    }

    const shmInfo = await FileSystem.getInfoAsync(shmPath);
    if (shmInfo.exists) {
      await FileSystem.deleteAsync(shmPath, { idempotent: true });
    }

    console.log('Database reset complete. Restart the app to recreate.');
    return true;
  } catch (error) {
    console.error('Error resetting database:', error);
    throw error;
  }
}
