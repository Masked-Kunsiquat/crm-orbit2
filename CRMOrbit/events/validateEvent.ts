import type { Event } from "./event";
import { EVENT_TYPES } from "./eventTypes";

const EVENT_TYPE_SET = new Set(EVENT_TYPES);

const isSerializable = (value: unknown): boolean => {
  try {
    JSON.stringify(value);
    return true;
  } catch {
    return false;
  }
};

export const validateEvent = (event: Event): void => {
  if (!EVENT_TYPE_SET.has(event.type as (typeof EVENT_TYPES)[number])) {
    throw new Error(`Unknown event type: ${event.type}`);
  }

  if (!event.timestamp) {
    throw new Error("Event timestamp is required.");
  }

  if (!isSerializable(event.payload)) {
    throw new Error("Event payload must be serializable.");
  }
};
