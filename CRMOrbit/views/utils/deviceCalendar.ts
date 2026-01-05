import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Calendar from "expo-calendar";
import { Platform } from "react-native";

export const DEFAULT_DEVICE_CALENDAR_NAME = "CRMOrbit";

const CALENDAR_NAME_KEY = "calendar.sync.name";
const CALENDAR_ID_KEY = "calendar.sync.id";
const CALENDAR_EVENT_MAP_KEY = "calendar.sync.eventMap";
const CALENDAR_LAST_SYNC_KEY = "calendar.sync.lastSync";

export type CalendarSyncEvent = {
  key: string;
  title: string;
  startDate: Date;
  endDate: Date;
  notes?: string;
};

export type CalendarSyncSummary = {
  created: number;
  updated: number;
  deleted: number;
};

type CalendarSourceInput = {
  id?: string;
  name?: string;
  isLocalAccount?: boolean;
};

const getDefaultCalendarSource = async (): Promise<CalendarSourceInput> => {
  if (Platform.OS === "ios") {
    const defaultCalendar = await Calendar.getDefaultCalendarAsync();
    return defaultCalendar.source ?? {};
  }

  return { isLocalAccount: true, name: DEFAULT_DEVICE_CALENDAR_NAME };
};

export const getStoredCalendarName = async (): Promise<string> => {
  const stored = await AsyncStorage.getItem(CALENDAR_NAME_KEY);
  return stored?.trim() || DEFAULT_DEVICE_CALENDAR_NAME;
};

export const setStoredCalendarName = async (name: string): Promise<void> => {
  const trimmed = name.trim();
  await AsyncStorage.setItem(
    CALENDAR_NAME_KEY,
    trimmed || DEFAULT_DEVICE_CALENDAR_NAME,
  );
};

export const getStoredCalendarId = async (): Promise<string | null> => {
  return AsyncStorage.getItem(CALENDAR_ID_KEY);
};

const setStoredCalendarId = async (calendarId: string): Promise<void> => {
  await AsyncStorage.setItem(CALENDAR_ID_KEY, calendarId);
};

const getStoredEventMap = async (): Promise<Record<string, string>> => {
  const raw = await AsyncStorage.getItem(CALENDAR_EVENT_MAP_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed ?? {};
  } catch {
    return {};
  }
};

const setStoredEventMap = async (
  map: Record<string, string>,
): Promise<void> => {
  await AsyncStorage.setItem(CALENDAR_EVENT_MAP_KEY, JSON.stringify(map));
};

export const getLastCalendarSync = async (): Promise<string | null> => {
  return AsyncStorage.getItem(CALENDAR_LAST_SYNC_KEY);
};

const setLastCalendarSync = async (timestamp: string): Promise<void> => {
  await AsyncStorage.setItem(CALENDAR_LAST_SYNC_KEY, timestamp);
};

const normalizeEventTimes = (event: CalendarSyncEvent): CalendarSyncEvent => {
  if (event.endDate.getTime() > event.startDate.getTime()) {
    return event;
  }
  const adjustedEnd = new Date(event.startDate.getTime() + 60_000);
  return { ...event, endDate: adjustedEnd };
};

export const ensureDeviceCalendar = async (
  calendarName: string,
): Promise<string> => {
  const desiredName = calendarName.trim() || DEFAULT_DEVICE_CALENDAR_NAME;
  const storedId = await getStoredCalendarId();

  if (storedId) {
    try {
      const existing = await Calendar.getCalendarAsync(storedId);
      if (existing) {
        if (existing.title !== desiredName || existing.name !== desiredName) {
          await Calendar.updateCalendarAsync(storedId, {
            title: desiredName,
            name: desiredName,
          });
        }
        return storedId;
      }
    } catch {
      // Fall through to create a new calendar.
    }
  }

  const source = await getDefaultCalendarSource();
  const calendarId = await Calendar.createCalendarAsync({
    title: desiredName,
    name: desiredName,
    color: "#2F855A",
    entityType: Calendar.EntityTypes.EVENT,
    sourceId: source.id,
    source,
    ownerAccount: "personal",
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });

  await setStoredCalendarId(calendarId);
  return calendarId;
};

export const syncDeviceCalendarEvents = async (
  calendarId: string,
  events: CalendarSyncEvent[],
): Promise<CalendarSyncSummary> => {
  const existingMap = await getStoredEventMap();
  const nextMap: Record<string, string> = {};
  let created = 0;
  let updated = 0;
  let deleted = 0;

  for (const rawEvent of events) {
    const event = normalizeEventTimes(rawEvent);
    const existingId = existingMap[event.key];
    if (existingId) {
      try {
        await Calendar.updateEventAsync(existingId, {
          title: event.title,
          startDate: event.startDate,
          endDate: event.endDate,
          notes: event.notes,
          alarms: [],
        });
        nextMap[event.key] = existingId;
        updated += 1;
        continue;
      } catch {
        // If the event is missing, recreate it below.
      }
    }

    try {
      const newId = await Calendar.createEventAsync(calendarId, {
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        notes: event.notes,
        alarms: [],
      });
      nextMap[event.key] = newId;
      created += 1;
    } catch {
      // Skip events that fail to sync.
    }
  }

  for (const [key, eventId] of Object.entries(existingMap)) {
    if (nextMap[key]) continue;
    try {
      await Calendar.deleteEventAsync(eventId);
      deleted += 1;
    } catch {
      // Ignore delete errors for missing events.
    }
  }

  await setStoredEventMap(nextMap);
  await setLastCalendarSync(new Date().toISOString());

  return { created, updated, deleted };
};
