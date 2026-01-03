import { useMemo } from "react";

import { nextId } from "@domains/shared/idGenerator";

let cachedDeviceId: string | null = null;
let warnedFallback = false;

const getEnvDeviceId = (): string | null => {
  const envDeviceId = (
    globalThis as {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env?.EXPO_PUBLIC_DEVICE_ID;

  const trimmed = typeof envDeviceId === "string" ? envDeviceId.trim() : "";
  return trimmed || null;
};

const resolveDeviceId = (): string => {
  if (cachedDeviceId) return cachedDeviceId;

  const envId = getEnvDeviceId();
  if (envId) {
    cachedDeviceId = envId;
    return cachedDeviceId;
  }

  cachedDeviceId = nextId("device");

  if (!warnedFallback) {
    warnedFallback = true;
    console.warn(
      "Device ID not configured; using generated device ID for this session.",
    );
  }

  return cachedDeviceId;
};

export const setDeviceId = (deviceId: string): void => {
  cachedDeviceId = deviceId.trim() || deviceId;
};

export const getDeviceIdFromEnv = (): string | null => getEnvDeviceId();

export const useDeviceId = (): string => useMemo(resolveDeviceId, []);
