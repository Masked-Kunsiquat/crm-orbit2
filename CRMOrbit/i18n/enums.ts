import type {
  CalendarEventStatus,
  CalendarEventType,
} from "@domains/calendarEvent";
import type { AppPaletteId } from "@domains/shared/theme/colors";
import type { CalendarPaletteId } from "@domains/settings";

export const CALENDAR_PALETTE_I18N_KEYS: Record<CalendarPaletteId, string> = {
  orbit: "calendar.colors.palette.orbit",
  meadow: "calendar.colors.palette.meadow",
  ember: "calendar.colors.palette.ember",
};

export const APP_PALETTE_I18N_KEYS: Record<AppPaletteId, string> = {
  orbit: "settings.appearance.palette.orbit",
  meadow: "settings.appearance.palette.meadow",
  ember: "settings.appearance.palette.ember",
};

export const CALENDAR_EVENT_TYPE_I18N_KEYS: Record<CalendarEventType, string> =
  {
    "calendarEvent.type.meeting": "calendarEvent.type.meeting",
    "calendarEvent.type.call": "calendarEvent.type.call",
    "calendarEvent.type.email": "calendarEvent.type.email",
    "calendarEvent.type.audit": "calendarEvent.type.audit",
    "calendarEvent.type.task": "calendarEvent.type.task",
    "calendarEvent.type.reminder": "calendarEvent.type.reminder",
    "calendarEvent.type.other": "calendarEvent.type.other",
  };

export const CALENDAR_EVENT_STATUS_I18N_KEYS: Record<
  CalendarEventStatus,
  string
> = {
  "calendarEvent.status.scheduled": "calendarEvent.status.scheduled",
  "calendarEvent.status.completed": "calendarEvent.status.completed",
  "calendarEvent.status.canceled": "calendarEvent.status.canceled",
};
