import type { AutomergeDoc } from "@automerge/schema";
import type { DeviceId } from "@domains/shared/types";
import type { Event } from "@events/event";
import { buildEvent } from "@events/dispatcher";
import { encryptCode } from "@utils/encryption";
import { createLogger } from "@utils/logger";

type EncryptFn = (plaintext: string) => Promise<string>;

const logger = createLogger("CodeEncryptionMigration");

export const buildCodeEncryptionEvents = async (
  doc: AutomergeDoc,
  deviceId: DeviceId,
  encrypt: EncryptFn = encryptCode,
): Promise<Event[]> => {
  const pending = Object.values(doc.codes).filter((code) => !code.isEncrypted);
  if (pending.length === 0) {
    return [];
  }

  logger.info("Encrypting legacy codes", { count: pending.length });

  const events: Event[] = [];

  for (const code of pending) {
    try {
      const encryptedValue = await encrypt(code.codeValue);
      events.push(
        buildEvent({
          type: "code.encrypted",
          entityId: code.id,
          payload: {
            codeValue: encryptedValue,
            isEncrypted: true,
          },
          deviceId,
        }),
      );
    } catch (error) {
      logger.error("Failed to encrypt code during migration", {
        codeId: code.id,
      });
      logger.error("Encryption error", error);
    }
  }

  if (events.length === 0) {
    logger.warn("No codes were encrypted during migration");
  }

  return events;
};
