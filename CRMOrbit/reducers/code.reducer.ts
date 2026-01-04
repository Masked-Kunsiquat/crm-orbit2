import type { Code, CodeType } from "../domains/code";
import type { AutomergeDoc } from "../automerge/schema";
import type { Event } from "../events/event";
import type { EntityId } from "../domains/shared/types";
import { resolveEntityId } from "./shared";
import { createLogger } from "../utils/logger";

const logger = createLogger("CodeReducer");

type CodeCreatedPayload = {
  id: EntityId;
  accountId: EntityId;
  label: string;
  codeValue: string;
  isEncrypted?: boolean;
  type: CodeType;
  notes?: string;
  createdAt?: string;
};

type CodeUpdatedPayload = {
  id?: EntityId;
  accountId?: EntityId;
  label?: string;
  codeValue?: string;
  isEncrypted?: boolean;
  type?: CodeType;
  notes?: string;
};

type CodeEncryptedPayload = {
  id?: EntityId;
  codeValue: string;
  isEncrypted?: boolean;
};

const applyCodeCreated = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  const payload = event.payload as CodeCreatedPayload;
  const id = resolveEntityId(event, payload);

  logger.debug("Creating code", { id, accountId: payload.accountId });

  if (doc.codes[id]) {
    logger.error("Code already exists", { id });
    throw new Error(`Code already exists: ${id}`);
  }

  if (!doc.accounts[payload.accountId]) {
    logger.error("Account not found for code", {
      accountId: payload.accountId,
    });
    throw new Error(`Account not found for code: ${payload.accountId}`);
  }

  if (doc.relations.accountCodes[id]) {
    logger.error("Account code relation already exists", { id });
    throw new Error(`Account code relation already exists: ${id}`);
  }

  const createdAt = payload.createdAt ?? event.timestamp;
  const isEncrypted = payload.isEncrypted ?? false;

  const code: Code = {
    id,
    accountId: payload.accountId,
    label: payload.label,
    codeValue: payload.codeValue,
    isEncrypted,
    type: payload.type,
    ...(payload.notes !== undefined && { notes: payload.notes }),
    createdAt,
    updatedAt: event.timestamp,
  };

  logger.info("Code created", { id, label: payload.label });

  return {
    ...doc,
    codes: {
      ...doc.codes,
      [id]: code,
    },
    relations: {
      ...doc.relations,
      accountCodes: {
        ...doc.relations.accountCodes,
        [id]: {
          accountId: payload.accountId,
          codeId: id,
        },
      },
    },
  };
};

const applyCodeUpdated = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  const payload = event.payload as CodeUpdatedPayload;
  const id = resolveEntityId(event, payload);
  const existing = doc.codes[id] as Code | undefined;

  if (!existing) {
    logger.error("Code not found for update", { id });
    throw new Error(`Code not found: ${id}`);
  }

  if (payload.accountId && !doc.accounts[payload.accountId]) {
    logger.error("Account not found for code update", {
      accountId: payload.accountId,
    });
    throw new Error(`Account not found: ${payload.accountId}`);
  }

  const nextAccountId = payload.accountId ?? existing.accountId;

  logger.debug("Updating code", { id, updates: payload });

  const updated: Code = {
    ...existing,
    accountId: nextAccountId,
    label: payload.label ?? existing.label,
    codeValue: payload.codeValue ?? existing.codeValue,
    isEncrypted: payload.isEncrypted ?? existing.isEncrypted ?? false,
    type: payload.type ?? existing.type,
    ...(payload.notes !== undefined
      ? { notes: payload.notes }
      : existing.notes !== undefined
        ? { notes: existing.notes }
        : {}),
    updatedAt: event.timestamp,
  };

  return {
    ...doc,
    codes: {
      ...doc.codes,
      [id]: updated,
    },
    relations: {
      ...doc.relations,
      accountCodes: {
        ...doc.relations.accountCodes,
        [id]: {
          accountId: nextAccountId,
          codeId: id,
        },
      },
    },
  };
};

const applyCodeEncrypted = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  const payload = event.payload as CodeEncryptedPayload;
  const id = resolveEntityId(event, payload);
  const existing = doc.codes[id] as Code | undefined;

  if (!existing) {
    logger.error("Code not found for encryption", { id });
    throw new Error(`Code not found: ${id}`);
  }

  if (typeof payload.codeValue !== "string") {
    logger.error("Encrypted code payload missing codeValue", { id });
    throw new Error(`Encrypted code payload missing codeValue: ${id}`);
  }

  const nextEncrypted = payload.isEncrypted ?? true;
  if (!nextEncrypted) {
    logger.error("Encrypted code payload must set isEncrypted", { id });
    throw new Error(`Encrypted code payload must set isEncrypted: ${id}`);
  }

  const updated: Code = {
    ...existing,
    codeValue: payload.codeValue,
    isEncrypted: true,
    updatedAt: event.timestamp,
  };

  return {
    ...doc,
    codes: {
      ...doc.codes,
      [id]: updated,
    },
  };
};

const applyCodeDeleted = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  const payload = event.payload as { id?: EntityId };
  const id = resolveEntityId(event, payload);
  const existing = doc.codes[id] as Code | undefined;

  if (!existing) {
    logger.error("Code not found for deletion", { id });
    throw new Error(`Code not found: ${id}`);
  }

  logger.info("Code deleted", { id });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [id]: _removed, ...remainingCodes } = doc.codes;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [id]: _relation, ...remainingAccountCodes } =
    doc.relations.accountCodes;

  return {
    ...doc,
    codes: remainingCodes,
    relations: {
      ...doc.relations,
      accountCodes: remainingAccountCodes,
    },
  };
};

export const codeReducer = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  logger.debug("Processing event", {
    type: event.type,
    entityId: event.entityId,
  });

  switch (event.type) {
    case "code.created":
      return applyCodeCreated(doc, event);
    case "code.updated":
      return applyCodeUpdated(doc, event);
    case "code.encrypted":
      return applyCodeEncrypted(doc, event);
    case "code.deleted":
      return applyCodeDeleted(doc, event);
    default:
      logger.error("Unhandled event type", { type: event.type });
      throw new Error(`code.reducer does not handle event type: ${event.type}`);
  }
};
