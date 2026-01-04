import { useCallback } from "react";

import { buildEvent } from "../../events/dispatcher";
import type { CodeType } from "../../domains/code";
import { nextId } from "../../domains/shared/idGenerator";
import type { EntityId } from "../../domains/shared/types";
import type { DispatchResult } from "./useDispatch";
import { useDispatch } from "./useDispatch";
import { encryptCode } from "../../utils/encryption";

export const useCodeActions = (deviceId: string) => {
  const { dispatch } = useDispatch();

  const createCode = useCallback(
    async (
      accountId: EntityId,
      label: string,
      codeValue: string,
      type: CodeType = "code.type.other",
      notes?: string,
      codeId?: EntityId,
    ): Promise<DispatchResult> => {
      try {
        const encryptedValue = await encryptCode(codeValue);
        const id = codeId ?? nextId("code");
        const event = buildEvent({
          type: "code.created",
          entityId: id,
          payload: {
            id,
            accountId,
            label,
            codeValue: encryptedValue,
            isEncrypted: true,
            type,
            ...(notes !== undefined && { notes }),
          },
          deviceId,
        });

        return dispatch([event]);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to encrypt code value.";
        return { success: false, error: errorMessage };
      }
    },
    [deviceId, dispatch],
  );

  const updateCode = useCallback(
    async (
      codeId: EntityId,
      label: string,
      codeValue: string,
      type: CodeType,
      notes?: string,
      accountId?: EntityId,
    ): Promise<DispatchResult> => {
      try {
        const encryptedValue = await encryptCode(codeValue);
        const event = buildEvent({
          type: "code.updated",
          entityId: codeId,
          payload: {
            label,
            codeValue: encryptedValue,
            isEncrypted: true,
            type,
            ...(notes !== undefined && { notes }),
            ...(accountId && { accountId }),
          },
          deviceId,
        });

        return dispatch([event]);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to encrypt code value.";
        return { success: false, error: errorMessage };
      }
    },
    [deviceId, dispatch],
  );

  const deleteCode = useCallback(
    (codeId: EntityId): DispatchResult => {
      const event = buildEvent({
        type: "code.deleted",
        entityId: codeId,
        payload: {
          id: codeId,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  return {
    createCode,
    updateCode,
    deleteCode,
  };
};
