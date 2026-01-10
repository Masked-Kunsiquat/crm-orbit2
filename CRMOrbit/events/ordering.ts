import type { Event } from "./event";

export const sortEvents = (events: Event[]): Event[] => {
  return [...events].sort((left, right) => {
    if (left.timestamp !== right.timestamp) {
      return left.timestamp.localeCompare(right.timestamp);
    }
    if (left.deviceId !== right.deviceId) {
      return left.deviceId.localeCompare(right.deviceId);
    }
    return left.id.localeCompare(right.id);
  });
};
