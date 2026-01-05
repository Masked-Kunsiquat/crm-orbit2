import { t } from "@i18n/index";

export const splitDurationMinutes = (
  durationMinutes?: number,
): { hours: number; minutes: number } => {
  if (!durationMinutes || durationMinutes <= 0) {
    return { hours: 0, minutes: 0 };
  }
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  return { hours, minutes };
};

export const parseDurationMinutes = (
  hoursValue: string,
  minutesValue: string,
): number | null | undefined => {
  const hoursText = hoursValue.trim();
  const minutesText = minutesValue.trim();
  if (!hoursText && !minutesText) {
    return undefined;
  }

  const hours = hoursText ? Number(hoursText) : 0;
  const minutes = minutesText ? Number(minutesText) : 0;

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return null;
  }

  if (hours < 0 || minutes < 0) {
    return null;
  }

  return hours * 60 + minutes;
};

export const addMinutesToTimestamp = (
  timestamp: string | undefined,
  durationMinutes: number | undefined,
): string | undefined => {
  if (!timestamp || !durationMinutes) {
    return undefined;
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  date.setMinutes(date.getMinutes() + durationMinutes);
  return date.toISOString();
};

export const formatDurationLabel = (minutes: number): string => {
  if (minutes % 60 === 0) {
    return t("common.duration.hours", { count: minutes / 60 });
  }
  return t("common.duration.minutes", { count: minutes });
};
