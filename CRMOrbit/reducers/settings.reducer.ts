import type { AutomergeDoc } from "../automerge/schema";
import type { Event } from "../events/event";
import {
  DEFAULT_APPEARANCE_SETTINGS,
  DEFAULT_CALENDAR_SETTINGS,
  DEFAULT_SECURITY_SETTINGS,
  isAppPaletteId,
  isAppearanceThemeMode,
  isCalendarPaletteId,
  isSecurityAuthFrequency,
  isSecurityBiometricSetting,
  isSecurityBlurTimeout,
} from "../domains/settings";
import { createLogger } from "../utils/logger";

const logger = createLogger("SettingsReducer");

type SecuritySettingsUpdatedPayload = {
  biometricAuth?: string;
  blurTimeout?: string;
  authFrequency?: string;
};

type CalendarSettingsUpdatedPayload = {
  palette?: string;
};

type AppearanceSettingsUpdatedPayload = {
  palette?: string;
  mode?: string;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const applySecuritySettingsUpdated = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  if (!isObject(event.payload)) {
    logger.error("Invalid settings.security.updated payload", {
      payload: event.payload,
    });
    throw new Error("settings.security.updated payload must be an object");
  }

  const payload = event.payload as SecuritySettingsUpdatedPayload;
  const current = doc.settings?.security ?? DEFAULT_SECURITY_SETTINGS;

  if (
    payload.biometricAuth !== undefined &&
    !isSecurityBiometricSetting(payload.biometricAuth)
  ) {
    throw new Error(`Invalid biometricAuth setting: ${payload.biometricAuth}`);
  }

  if (
    payload.blurTimeout !== undefined &&
    !isSecurityBlurTimeout(payload.blurTimeout)
  ) {
    throw new Error(`Invalid blurTimeout setting: ${payload.blurTimeout}`);
  }

  if (
    payload.authFrequency !== undefined &&
    !isSecurityAuthFrequency(payload.authFrequency)
  ) {
    throw new Error(`Invalid authFrequency setting: ${payload.authFrequency}`);
  }

  const nextSecurity = {
    biometricAuth:
      payload.biometricAuth !== undefined
        ? payload.biometricAuth
        : current.biometricAuth,
    blurTimeout:
      payload.blurTimeout !== undefined
        ? payload.blurTimeout
        : current.blurTimeout,
    authFrequency:
      payload.authFrequency !== undefined
        ? payload.authFrequency
        : current.authFrequency,
  };

  logger.info("Security settings updated", nextSecurity);

  return {
    ...doc,
    settings: {
      ...doc.settings,
      security: nextSecurity,
    },
  };
};

const applyCalendarSettingsUpdated = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  if (!isObject(event.payload)) {
    logger.error("Invalid settings.calendar.updated payload", {
      payload: event.payload,
    });
    throw new Error("settings.calendar.updated payload must be an object");
  }

  const payload = event.payload as CalendarSettingsUpdatedPayload;
  const current = doc.settings?.calendar ?? DEFAULT_CALENDAR_SETTINGS;

  if (payload.palette !== undefined && !isCalendarPaletteId(payload.palette)) {
    throw new Error(`Invalid calendar palette: ${payload.palette}`);
  }

  const nextCalendar = {
    palette: payload.palette !== undefined ? payload.palette : current.palette,
  };

  logger.info("Calendar settings updated", nextCalendar);

  return {
    ...doc,
    settings: {
      ...doc.settings,
      calendar: nextCalendar,
    },
  };
};

const applyAppearanceSettingsUpdated = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  if (!isObject(event.payload)) {
    logger.error("Invalid settings.appearance.updated payload", {
      payload: event.payload,
    });
    throw new Error("settings.appearance.updated payload must be an object");
  }

  const payload = event.payload as AppearanceSettingsUpdatedPayload;
  const current = doc.settings?.appearance ?? DEFAULT_APPEARANCE_SETTINGS;

  if (payload.palette !== undefined && !isAppPaletteId(payload.palette)) {
    throw new Error(`Invalid app palette: ${payload.palette}`);
  }

  if (payload.mode !== undefined && !isAppearanceThemeMode(payload.mode)) {
    throw new Error(`Invalid theme mode: ${payload.mode}`);
  }

  const nextAppearance = {
    palette: payload.palette !== undefined ? payload.palette : current.palette,
    mode: payload.mode !== undefined ? payload.mode : current.mode,
  };

  logger.info("Appearance settings updated", nextAppearance);

  return {
    ...doc,
    settings: {
      ...doc.settings,
      appearance: nextAppearance,
    },
  };
};

export const settingsReducer = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  logger.debug("Processing event", {
    type: event.type,
    entityId: event.entityId,
  });

  switch (event.type) {
    case "settings.security.updated":
      return applySecuritySettingsUpdated(doc, event);
    case "settings.calendar.updated":
      return applyCalendarSettingsUpdated(doc, event);
    case "settings.appearance.updated":
      return applyAppearanceSettingsUpdated(doc, event);
    default:
      logger.error("Unhandled event type", { type: event.type });
      throw new Error(
        `settings.reducer does not handle event type: ${event.type}`,
      );
  }
};
