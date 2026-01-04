import { useCallback } from "react";

import { buildEvent } from "../../events/dispatcher";
import type { CodeType } from "../../domains/code";
import { nextId } from "../../domains/shared/idGenerator";
import type { EntityId } from "../../domains/shared/types";
import type { DispatchResult } from "./useDispatch";
import { useDispatch } from "./useDispatch";
export const useCodeActions = (deviceId: string) => {
  const { dispatch } = useDispatch();

  const createCode = useCallback(
    (
      accountId: EntityId,
      label: string,
      codeValue: string,
      type: CodeType = "code.type.other",
      notes?: string,
      codeId?: EntityId,
    ): DispatchResult => {
      const id = codeId ?? nextId("code");
      const event = buildEvent({
        type: "code.created",
        entityId: id,
        payload: {
          id,
          accountId,
          label,
          codeValue,
          isEncrypted: true,
          type,
          ...(notes !== undefined && { notes }),
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  const updateCode = useCallback(
    (
      codeId: EntityId,
      label: string,
      codeValue: string,
      type: CodeType,
      notes?: string,
      accountId?: EntityId,
    ): DispatchResult => {
      const event = buildEvent({
        type: "code.updated",
        entityId: codeId,
        payload: {
          label,
          codeValue,
          isEncrypted: true,
          type,
          ...(notes !== undefined && { notes }),
          ...(accountId && { accountId }),
        },
        deviceId,
      });

      return dispatch([event]);
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
