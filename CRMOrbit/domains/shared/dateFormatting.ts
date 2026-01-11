import type { Timestamp } from "./types";

/**
 * Format a timestamp to a localized date-time string.
 *
 * This is the canonical domain utility for date formatting, ensuring
 * consistent date display across the application.
 *
 * @param timestamp - ISO 8601 timestamp string
 * @param fallback - Optional fallback string if timestamp is invalid (default: "Unknown")
 * @returns Localized date-time string
 *
 * @example
 * ```ts
 * formatTimestamp("2024-01-15T10:30:00.000Z") // "1/15/2024, 10:30:00 AM"
 * formatTimestamp("invalid", "N/A") // "N/A"
 * formatTimestamp(undefined, "Not set") // "Not set"
 * ```
 */
export const formatTimestamp = (
  timestamp?: Timestamp | string,
  fallback: string = "Unknown",
): string => {
  if (!timestamp) {
    return fallback;
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }
  return date.toLocaleString();
};

/**
 * Format a timestamp to a localized date string (no time).
 *
 * @param timestamp - ISO 8601 timestamp string
 * @param fallback - Optional fallback string if timestamp is invalid (default: "Unknown")
 * @returns Localized date string
 *
 * @example
 * ```ts
 * formatDate("2024-01-15T10:30:00.000Z") // "1/15/2024"
 * ```
 */
export const formatDate = (
  timestamp?: Timestamp | string,
  fallback: string = "Unknown",
): string => {
  if (!timestamp) {
    return fallback;
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }
  return date.toLocaleDateString();
};

/**
 * Format a timestamp to a localized time string (no date).
 *
 * @param timestamp - ISO 8601 timestamp string
 * @param fallback - Optional fallback string if timestamp is invalid (default: "Unknown")
 * @returns Localized time string
 *
 * @example
 * ```ts
 * formatTime("2024-01-15T10:30:00.000Z") // "10:30:00 AM"
 * ```
 */
export const formatTime = (
  timestamp?: Timestamp | string,
  fallback: string = "Unknown",
): string => {
  if (!timestamp) {
    return fallback;
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }
  return date.toLocaleTimeString();
};
