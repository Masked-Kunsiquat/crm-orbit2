import { applyEvent, registerReducers } from "../automerge/applyEvent";
import type { AutomergeDoc } from "../automerge/schema";
import type { DeviceId, EntityId, Timestamp } from "../shared/types";
import type { Event } from "./event";
import type { EventType } from "./eventTypes";
import { REDUCER_MAP } from "../reducers/registry";

let reducersRegistered = false;
let eventCounter = 0;

const nextEventId = (): string => {
  eventCounter += 1;
  return `evt-${Date.now()}-${eventCounter}`;
};

export const registerCoreReducers = (): void => {
  if (reducersRegistered) {
    return;
  }

  registerReducers(REDUCER_MAP);
  reducersRegistered = true;
};

export type BuildEventInput = {
  type: EventType;
  payload: unknown;
  entityId?: EntityId;
  timestamp?: Timestamp;
  deviceId: DeviceId;
};

export const buildEvent = (input: BuildEventInput): Event => ({
  id: nextEventId(),
  type: input.type,
  entityId: input.entityId,
  payload: input.payload,
  timestamp: input.timestamp ?? new Date().toISOString(),
  deviceId: input.deviceId,
});

export const applyEvents = (
  doc: AutomergeDoc,
  events: Event[],
): AutomergeDoc => {
  return events.reduce((next, event) => applyEvent(next, event), doc);
};
