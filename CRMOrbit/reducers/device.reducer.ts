import type { AutomergeDoc } from "../automerge/schema";
import type { Event } from "../events/event";
import { createLogger } from "../utils/logger";

const logger = createLogger("DeviceReducer");

export const deviceReducer = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  logger.debug("Processing device event", { type: event.type });
  return doc;
};
