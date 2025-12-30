import type { Event } from "../events/event";
import type { EventType } from "../events/eventTypes";
import type { AutomergeDoc } from "./schema";

export type Reducer = (doc: AutomergeDoc, event: Event) => AutomergeDoc;

const REDUCERS: Partial<Record<EventType, Reducer>> = {};

export const applyEvent = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  const reducer = REDUCERS[event.type as EventType];

  if (!reducer) {
    throw new Error(`No reducer registered for event type: ${event.type}`);
  }

  return reducer(doc, event);
};
