import type {
  CalendarEventStatus,
  CalendarEventType,
} from "@domains/calendarEvent";
import type { CalendarPaletteId } from "@domains/settings";

export const CALENDAR_PALETTE_I18N_KEYS: Record<CalendarPaletteId, string> = {
  orbit: "calendar.colors.palette.orbit",
  meadow: "calendar.colors.palette.meadow",
  ember: "calendar.colors.palette.ember",
};

export const CALENDAR_EVENT_TYPE_I18N_KEYS: Record<CalendarEventType, string> =
  {
    meeting: "calendarEvent.type.meeting",
    call: "calendarEvent.type.call",
    email: "calendarEvent.type.email",
    audit: "calendarEvent.type.audit",
    task: "calendarEvent.type.task",
    reminder: "calendarEvent.type.reminder",
    other: "calendarEvent.type.other",
  };

export const CALENDAR_EVENT_STATUS_I18N_KEYS: Record<
  CalendarEventStatus,
  string
> = {
  "calendarEvent.status.scheduled": "calendarEvent.status.scheduled",
  "calendarEvent.status.completed": "calendarEvent.status.completed",
  "calendarEvent.status.canceled": "calendarEvent.status.canceled",
};
