import type { AutomergeDoc } from "../automerge/schema";
import type { Event } from "../events/event";
import {
  DEFAULT_SECURITY_SETTINGS,
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
    throw new Error(
      `Invalid biometricAuth setting: ${payload.biometricAuth}`,
    );
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
    default:
      logger.error("Unhandled event type", { type: event.type });
      throw new Error(
        `settings.reducer does not handle event type: ${event.type}`,
      );
  }
};
