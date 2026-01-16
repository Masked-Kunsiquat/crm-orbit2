import type { Event } from "@events/event";
import { buildTypedEvent } from "./eventBuilder";
import type { ExternalCalendarChange } from "@domains/externalCalendarSync";

export type ExternalCalendarChangeCommitter = (
  events: Event[],
) => Promise<void>;

export const commitExternalCalendarChanges = async (
  changes: ExternalCalendarChange[],
  commitEvents: ExternalCalendarChangeCommitter,
): Promise<Event[]> => {
  if (changes.length === 0) {
    return [];
  }

  const events = changes.map((change) =>
    buildTypedEvent({
      type: change.type,
      entityId: change.entityId,
      payload: change.payload,
      deviceId: change.deviceId,
      timestamp: change.timestamp,
    }),
  );

  await commitEvents(events);
  return events;
};
