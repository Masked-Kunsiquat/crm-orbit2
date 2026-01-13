import type { ColorScheme } from "@domains/shared/theme/colors";
import type { CalendarPaletteId } from "@domains/settings";
import { CALENDAR_PALETTE_I18N_KEYS } from "@i18n/enums";

type CalendarPaletteToken = "accent" | "success" | "warning" | "textMuted";

type CalendarPaletteConfig = {
  id: CalendarPaletteId;
  labelKey: string;
  audit: {
    scheduled: CalendarPaletteToken;
    completed: CalendarPaletteToken;
    canceled: CalendarPaletteToken;
  };
  interaction: {
    scheduled: CalendarPaletteToken;
    completed: CalendarPaletteToken;
    canceled: CalendarPaletteToken;
  };
  timeline: {
    audit: CalendarPaletteToken;
    interaction: CalendarPaletteToken;
  };
};

export type CalendarPaletteColors = {
  audit: {
    scheduled: string;
    completed: string;
    canceled: string;
  };
  interaction: {
    scheduled: string;
    completed: string;
    canceled: string;
  };
  timeline: {
    audit: string;
    interaction: string;
  };
};

export const CALENDAR_PALETTES: ReadonlyArray<CalendarPaletteConfig> = [
  {
    id: "orbit",
    labelKey: CALENDAR_PALETTE_I18N_KEYS.orbit,
    audit: {
      scheduled: "accent",
      completed: "success",
      canceled: "textMuted",
    },
    interaction: {
      scheduled: "warning",
      completed: "success",
      canceled: "textMuted",
    },
    timeline: {
      audit: "accent",
      interaction: "warning",
    },
  },
  {
    id: "meadow",
    labelKey: CALENDAR_PALETTE_I18N_KEYS.meadow,
    audit: {
      scheduled: "success",
      completed: "accent",
      canceled: "textMuted",
    },
    interaction: {
      scheduled: "accent",
      completed: "success",
      canceled: "textMuted",
    },
    timeline: {
      audit: "success",
      interaction: "accent",
    },
  },
  {
    id: "ember",
    labelKey: CALENDAR_PALETTE_I18N_KEYS.ember,
    audit: {
      scheduled: "warning",
      completed: "accent",
      canceled: "textMuted",
    },
    interaction: {
      scheduled: "accent",
      completed: "warning",
      canceled: "textMuted",
    },
    timeline: {
      audit: "warning",
      interaction: "accent",
    },
  },
] as const;

const resolveTokenColor = (
  colors: ColorScheme,
  token: CalendarPaletteToken,
): string => {
  switch (token) {
    case "accent":
      return colors.accent;
    case "success":
      return colors.success;
    case "warning":
      return colors.warning;
    case "textMuted":
      return colors.textMuted;
  }
};

export const resolveCalendarPalette = (
  colors: ColorScheme,
  paletteId: CalendarPaletteId,
): CalendarPaletteColors => {
  const palette =
    CALENDAR_PALETTES.find((option) => option.id === paletteId) ??
    CALENDAR_PALETTES[0];

  return {
    audit: {
      scheduled: resolveTokenColor(colors, palette.audit.scheduled),
      completed: resolveTokenColor(colors, palette.audit.completed),
      canceled: resolveTokenColor(colors, palette.audit.canceled),
    },
    interaction: {
      scheduled: resolveTokenColor(colors, palette.interaction.scheduled),
      completed: resolveTokenColor(colors, palette.interaction.completed),
      canceled: resolveTokenColor(colors, palette.interaction.canceled),
    },
    timeline: {
      audit: resolveTokenColor(colors, palette.timeline.audit),
      interaction: resolveTokenColor(colors, palette.timeline.interaction),
    },
  };
};

/**
 * Get the appropriate calendar dot color for an audit based on its status
 */
export const getAuditDotColor = (
  palette: CalendarPaletteColors,
  status:
    | "audits.status.scheduled"
    | "audits.status.completed"
    | "audits.status.canceled",
): string => {
  switch (status) {
    case "audits.status.scheduled":
      return palette.audit.scheduled;
    case "audits.status.completed":
      return palette.audit.completed;
    case "audits.status.canceled":
      return palette.audit.canceled;
  }
};

/**
 * Get the appropriate calendar dot color for an interaction based on its status
 */
export const getInteractionDotColor = (
  palette: CalendarPaletteColors,
  status:
    | "interaction.status.scheduled"
    | "interaction.status.completed"
    | "interaction.status.canceled",
): string => {
  switch (status) {
    case "interaction.status.scheduled":
      return palette.interaction.scheduled;
    case "interaction.status.completed":
      return palette.interaction.completed;
    case "interaction.status.canceled":
      return palette.interaction.canceled;
  }
};
