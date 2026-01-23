import Automerge from "automerge";
import type { Doc } from "automerge";
import type { AutomergeDoc } from "../../automerge/schema";
import type { Account } from "../account";
import type { DeviceId, EntityId, Timestamp } from "../shared/types";
import type { Event } from "../../events/event";

const ensureAutomergeDoc = (doc: AutomergeDoc): Doc<AutomergeDoc> => {
  const candidate = doc as Doc<AutomergeDoc>;
  try {
    Automerge.save(candidate);
    return candidate;
  } catch {
    const sanitized = JSON.parse(JSON.stringify(doc)) as AutomergeDoc;
    return Automerge.from(sanitized);
  }
};

export interface AccountLifecycleMigrationResult {
  success: boolean;
  migratedAccounts: number;
  errors: string[];
}

export interface AccountLifecycleMigrationReport extends AccountLifecycleMigrationResult {
  accountIds: EntityId[];
  events: Event[];
}

const resolveActiveAt = (account: Account): Timestamp =>
  account.activeAt ?? account.createdAt ?? account.updatedAt;

const buildLifecycleEvent = (
  accountId: EntityId,
  payload: { id: EntityId; activeAt?: Timestamp; inactiveAt?: null },
  timestamp: Timestamp,
  deviceId: DeviceId,
): Event => ({
  id: `migration:${accountId}:lifecycle`,
  type: "account.updated",
  entityId: accountId,
  payload,
  timestamp,
  deviceId,
});

/**
 * Backfills account lifecycle fields for active accounts.
 *
 * This migration:
 * 1. Ensures active accounts have activeAt set (using createdAt fallback).
 * 2. Clears inactiveAt for active accounts.
 * 3. Emits account.updated events to persist the changes.
 * 4. Is idempotent - safe to run multiple times.
 */
export const migrateAccountLifecycle = (
  doc: AutomergeDoc,
  deviceId: DeviceId,
): { doc: AutomergeDoc; report: AccountLifecycleMigrationReport } => {
  let report: AccountLifecycleMigrationReport | null = null;
  const sourceDoc = JSON.parse(JSON.stringify(doc)) as AutomergeDoc;
  const accountEntries = Object.entries(sourceDoc.accounts || {}) as Array<
    [EntityId, Account]
  >;

  const updatedDoc = Automerge.change(ensureAutomergeDoc(doc), (draft) => {
    const result: AccountLifecycleMigrationReport = {
      success: true,
      migratedAccounts: 0,
      errors: [],
      accountIds: [],
      events: [],
    };
    const migrationDoc = draft as AutomergeDoc;

    try {
      if (!migrationDoc.accounts) {
        migrationDoc.accounts = {};
      }

      for (const [id, account] of accountEntries) {
        try {
          if (!account.id || account.id !== id) {
            throw new Error(`Invalid account id for ${id}`);
          }

          if (account.status !== "account.status.active") {
            continue;
          }

          const needsActiveAt = !account.activeAt;
          const hasInactiveAt = account.inactiveAt !== undefined;

          if (!needsActiveAt && !hasInactiveAt) {
            continue;
          }

          const draftAccount = migrationDoc.accounts[id] as Account | undefined;
          if (!draftAccount) {
            throw new Error(`Account not found for ${id}`);
          }

          const payload: {
            id: EntityId;
            activeAt?: Timestamp;
            inactiveAt?: null;
          } = { id };

          if (needsActiveAt) {
            const resolvedActiveAt = resolveActiveAt(account);
            if (!resolvedActiveAt) {
              throw new Error(`Account ${id} missing createdAt for activeAt`);
            }
            draftAccount.activeAt = resolvedActiveAt;
            payload.activeAt = resolvedActiveAt;
          }

          if (hasInactiveAt) {
            delete draftAccount.inactiveAt;
            payload.inactiveAt = null;
          }

          const eventTimestamp = account.updatedAt ?? account.createdAt;
          result.events.push(
            buildLifecycleEvent(id, payload, eventTimestamp, deviceId),
          );
          result.migratedAccounts += 1;
          result.accountIds.push(id);
        } catch (error) {
          const errorMsg = `Failed to migrate account ${id}: ${(error as Error).message}`;
          console.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }
    } catch (error) {
      result.success = false;
      const errorMsg = `Account lifecycle migration failed: ${(error as Error).message}`;
      console.error(errorMsg);
      result.errors.push(errorMsg);
    }

    report = result;
  });

  if (!report) {
    throw new Error("Account lifecycle migration did not produce a report.");
  }

  return {
    doc: updatedDoc as AutomergeDoc,
    report,
  };
};

export const validateAccountLifecycleMigration = (
  doc: AutomergeDoc,
): { valid: boolean; issues: string[] } => {
  const issues: string[] = [];
  const accountEntries = Object.entries(doc.accounts || {}) as Array<
    [EntityId, Account]
  >;

  for (const [id, account] of accountEntries) {
    if (account.status === "account.status.active") {
      if (!account.activeAt) {
        issues.push(`Active account ${id} missing activeAt`);
      }
      if (account.inactiveAt !== undefined) {
        issues.push(`Active account ${id} has inactiveAt set`);
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
};
