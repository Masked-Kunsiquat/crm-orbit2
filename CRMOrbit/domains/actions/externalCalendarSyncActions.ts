import type { Event } from "@events/event";
import { buildTypedEvent } from "./eventBuilder";
import type { ExternalCalendarChange } from "@domains/externalCalendarSync";

export const commitExternalCalendarChanges = (
  changes: ExternalCalendarChange[],
): Event[] =>
  changes.map((change) =>
    buildTypedEvent({
      type: change.type,
      entityId: change.entityId,
      payload: change.payload,
      deviceId: change.deviceId,
      timestamp: change.timestamp,
    }),
  );
