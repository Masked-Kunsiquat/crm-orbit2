import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  migrateToCalendarEvents,
  validateMigration,
  MigrationReport,
} from "./migrateToCalendarEvents";
import { AutomergeDoc } from "../../automerge/schema";
import { PersistenceDb, appendEvents } from "../persistence/store";

const MIGRATION_KEY = "completedMigrations";
const CALENDAR_EVENT_MIGRATION_ID = "calendarEvent.v1";

/**
 * Checks if a specific migration has already been run.
 *
 * @param migrationId - The unique identifier for the migration
 * @returns Promise resolving to true if migration has run, false otherwise
 */
export const hasMigrationRun = async (
  migrationId: string,
): Promise<boolean> => {
  try {
    const migrations = await AsyncStorage.getItem(MIGRATION_KEY);
    if (!migrations) {
      return false;
    }

    const completed: string[] = JSON.parse(migrations);
    return completed.includes(migrationId);
  } catch (error) {
    console.error("Error checking migration status:", error);
    return false;
  }
};

/**
 * Marks a migration as complete in AsyncStorage.
 * This prevents the migration from running again on subsequent app loads.
 *
 * @param migrationId - The unique identifier for the migration
 */
export const markMigrationComplete = async (
  migrationId: string,
): Promise<void> => {
  try {
    const existing = await AsyncStorage.getItem(MIGRATION_KEY);
    const completed: string[] = existing ? JSON.parse(existing) : [];

    if (!completed.includes(migrationId)) {
      completed.push(migrationId);
      await AsyncStorage.setItem(MIGRATION_KEY, JSON.stringify(completed));
    }
  } catch (error) {
    console.error("Error marking migration complete:", error);
    throw error;
  }
};

/**
 * Removes a migration completion marker.
 * Useful for testing or forcing a migration to run again.
 *
 * @param migrationId - The unique identifier for the migration
 */
export const clearMigrationMarker = async (
  migrationId: string,
): Promise<void> => {
  try {
    const existing = await AsyncStorage.getItem(MIGRATION_KEY);
    if (!existing) {
      return;
    }

    const completed: string[] = JSON.parse(existing);
    const filtered = completed.filter((id) => id !== migrationId);
    await AsyncStorage.setItem(MIGRATION_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error clearing migration marker:", error);
    throw error;
  }
};

/**
 * Gets a list of all completed migrations.
 *
 * @returns Promise resolving to array of migration IDs
 */
export const getCompletedMigrations = async (): Promise<string[]> => {
  try {
    const migrations = await AsyncStorage.getItem(MIGRATION_KEY);
    return migrations ? JSON.parse(migrations) : [];
  } catch (error) {
    console.error("Error getting completed migrations:", error);
    return [];
  }
};

/**
 * Runs the calendar event migration on the provided Automerge document.
 *
 * This function:
 * 1. Checks if migration has already run (idempotency)
 * 2. Migrates Interactions and Audits to CalendarEvents
 * 3. Generates events for persistence
 * 4. Persists events to database
 * 5. Validates the migration results
 * 6. Marks migration as complete if successful
 * 7. Returns detailed migration report
 *
 * @param doc - The Automerge document to migrate (will be mutated)
 * @param db - The persistence database for storing generated events
 * @param deviceId - Device identifier for event attribution
 * @returns Promise resolving to migration report
 * @throws Error if migration fails validation or persistence fails
 */
export const runCalendarEventMigration = async (
  doc: AutomergeDoc,
  db: PersistenceDb,
  deviceId: string = "migration",
): Promise<MigrationReport> => {
  // Check if migration has already run
  const alreadyRun = await hasMigrationRun(CALENDAR_EVENT_MIGRATION_ID);
  if (alreadyRun) {
    return {
      success: true,
      migratedInteractions: 0,
      migratedAudits: 0,
      migratedLinks: 0,
      errors: [],
      interactionIds: [],
      auditIds: [],
      linkIds: [],
      events: [],
    };
  }

  // Run migration (generates events for persistence)
  const result = migrateToCalendarEvents(doc, deviceId);

  if (result.errors.length > 0) {
    console.error("Migration errors:", result.errors);
  }

  // Persist generated events to database
  if (result.events.length > 0) {
    try {
      await appendEvents(db, result.events);
    } catch (error) {
      console.error("Failed to persist migration events:", error);
      throw new Error(
        `Failed to persist migration events: ${(error as Error).message}`,
      );
    }
  }

  // Validate migration
  const validation = validateMigration(doc);

  if (!validation.valid) {
    console.error("Migration validation failed:", validation.issues);
    throw new Error(
      `Migration validation failed: ${validation.issues.join("; ")}`,
    );
  }

  // Mark migration as complete
  await markMigrationComplete(CALENDAR_EVENT_MIGRATION_ID);

  return result;
};

/**
 * Forces the calendar event migration to run again by clearing its completion marker.
 * USE WITH CAUTION: This will cause the migration to run on next app load.
 *
 * This is useful for:
 * - Development/testing
 * - Fixing a failed migration
 * - Re-running after migration code changes
 */
export const resetCalendarEventMigration = async (): Promise<void> => {
  console.warn(
    "Resetting calendar event migration marker - migration will run again on next load",
  );
  await clearMigrationMarker(CALENDAR_EVENT_MIGRATION_ID);
};

/**
 * Gets the status of the calendar event migration.
 *
 * @returns Promise resolving to migration status object
 */
export const getCalendarEventMigrationStatus = async (): Promise<{
  hasRun: boolean;
  migrationId: string;
}> => {
  const hasRun = await hasMigrationRun(CALENDAR_EVENT_MIGRATION_ID);
  return {
    hasRun,
    migrationId: CALENDAR_EVENT_MIGRATION_ID,
  };
};
