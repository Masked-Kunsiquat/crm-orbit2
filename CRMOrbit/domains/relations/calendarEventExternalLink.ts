import type { EntityId, Timestamp } from "../shared/types";

export type ExternalCalendarProvider = "expo-calendar";

export interface CalendarEventExternalLink {
  id: EntityId;
  calendarEventId: EntityId;
  provider: ExternalCalendarProvider;
  calendarId: string;
  externalEventId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastSyncedAt?: Timestamp;
  lastExternalModifiedAt?: Timestamp;
}
