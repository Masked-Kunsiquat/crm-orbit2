import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/expo-sqlite";

import { calendarEventExternalLinks } from "./schema";

type DrizzleDb = ReturnType<typeof drizzle>;

export type CalendarEventExternalLinkRecord = {
  id: string;
  calendarEventId: string;
  provider: string;
  calendarId: string;
  externalEventId: string;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt?: string | null;
  lastExternalModifiedAt?: string | null;
};

export const insertCalendarEventExternalLink = async (
  db: DrizzleDb,
  record: CalendarEventExternalLinkRecord,
): Promise<void> => {
  await db.insert(calendarEventExternalLinks).values(record);
};

export const deleteCalendarEventExternalLink = async (
  db: DrizzleDb,
  linkId: string,
): Promise<void> => {
  await db
    .delete(calendarEventExternalLinks)
    .where(eq(calendarEventExternalLinks.id, linkId));
};

export const getCalendarEventExternalLink = async (
  db: DrizzleDb,
  linkId: string,
): Promise<CalendarEventExternalLinkRecord | null> => {
  const rows = await db
    .select()
    .from(calendarEventExternalLinks)
    .where(eq(calendarEventExternalLinks.id, linkId))
    .limit(1);
  return rows[0] ?? null;
};

export const listCalendarEventExternalLinks = async (
  db: DrizzleDb,
  calendarEventId: string,
): Promise<CalendarEventExternalLinkRecord[]> => {
  return await db
    .select()
    .from(calendarEventExternalLinks)
    .where(eq(calendarEventExternalLinks.calendarEventId, calendarEventId));
};
