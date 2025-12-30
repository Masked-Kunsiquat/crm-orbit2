import type { Event } from "../events/event";
import { EVENT_TYPES, type EventType } from "../events/eventTypes";
import type { AutomergeDoc } from "./schema";

export type Reducer = (doc: AutomergeDoc, event: Event) => AutomergeDoc;

const REDUCERS: Partial<Record<EventType, Reducer>> = {};

export const registerReducers = (
  reducers: Partial<Record<EventType, Reducer>>,
): void => {
  Object.assign(REDUCERS, reducers);
};

export const registerReducer = (
  eventType: EventType,
  reducer: Reducer,
): void => {
  REDUCERS[eventType] = reducer;
};

const EVENT_TYPE_SET = new Set<EventType>(EVENT_TYPES);

const isEventType = (type: string): type is EventType => EVENT_TYPE_SET.has(type);

export const applyEvent = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  if (!isEventType(event.type)) {
    throw new Error(`Invalid event type: ${event.type}`);
  }

  const reducer = REDUCERS[event.type];

  if (!reducer) {
    throw new Error(`No reducer registered for event type: ${event.type}`);
  }

  return reducer(doc, event);
};
