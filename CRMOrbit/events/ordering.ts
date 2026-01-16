import type { Event } from "./event";

type ParsedEventId = {
  epoch: number;
  counter: number;
};

const parseEventId = (id: string): ParsedEventId | null => {
  const match = /^evt-(\d+)-(\d+)$/.exec(id);
  if (!match) {
    return null;
  }
  const epoch = Number(match[1]);
  const counter = Number(match[2]);
  if (!Number.isFinite(epoch) || !Number.isFinite(counter)) {
    return null;
  }
  return { epoch, counter };
};

export const sortEvents = (events: Event[]): Event[] => {
  return [...events].sort((left, right) => {
    if (left.timestamp !== right.timestamp) {
      return left.timestamp.localeCompare(right.timestamp);
    }
    if (left.deviceId !== right.deviceId) {
      return left.deviceId.localeCompare(right.deviceId);
    }
    const leftParsed = parseEventId(left.id);
    const rightParsed = parseEventId(right.id);
    if (leftParsed && rightParsed) {
      if (leftParsed.epoch !== rightParsed.epoch) {
        return leftParsed.epoch - rightParsed.epoch;
      }
      if (leftParsed.counter !== rightParsed.counter) {
        return leftParsed.counter - rightParsed.counter;
      }
    }
    return left.id.localeCompare(right.id);
  });
};
