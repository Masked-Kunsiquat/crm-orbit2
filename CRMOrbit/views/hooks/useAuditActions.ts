import { useCallback } from "react";

import { buildEvent } from "../../events/dispatcher";
import { nextId } from "../../domains/shared/idGenerator";
import type { EntityId } from "../../domains/shared/types";
import type { DispatchResult } from "./useDispatch";
import { useDispatch } from "./useDispatch";

export const useAuditActions = (deviceId: string) => {
  const { dispatch } = useDispatch();

  const createAudit = useCallback(
    (
      accountId: EntityId,
      scheduledFor: string,
      durationMinutes: number,
      notes?: string,
      floorsVisited?: number[],
      auditId?: EntityId,
    ): DispatchResult => {
      const id = auditId ?? nextId("audit");
      const event = buildEvent({
        type: "audit.created",
        entityId: id,
        payload: {
          id,
          accountId,
          scheduledFor,
          durationMinutes,
          ...(notes !== undefined && { notes }),
          ...(floorsVisited !== undefined && { floorsVisited }),
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  const rescheduleAudit = useCallback(
    (auditId: EntityId, scheduledFor: string): DispatchResult => {
      const event = buildEvent({
        type: "audit.rescheduled",
        entityId: auditId,
        payload: {
          id: auditId,
          scheduledFor,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  const completeAudit = useCallback(
    (
      auditId: EntityId,
      occurredAt: string,
      durationMinutes: number,
      score?: number,
      notes?: string,
      floorsVisited?: number[],
    ): DispatchResult => {
      const event = buildEvent({
        type: "audit.completed",
        entityId: auditId,
        payload: {
          id: auditId,
          occurredAt,
          durationMinutes,
          ...(score !== undefined && { score }),
          ...(notes !== undefined && { notes }),
          ...(floorsVisited !== undefined && { floorsVisited }),
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  const updateAuditNotes = useCallback(
    (auditId: EntityId, notes?: string): DispatchResult => {
      const event = buildEvent({
        type: "audit.notes.updated",
        entityId: auditId,
        payload: {
          id: auditId,
          notes,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  const updateAuditFloorsVisited = useCallback(
    (auditId: EntityId, floorsVisited: number[]): DispatchResult => {
      const event = buildEvent({
        type: "audit.floorsVisited.updated",
        entityId: auditId,
        payload: {
          id: auditId,
          floorsVisited,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  const reassignAuditAccount = useCallback(
    (auditId: EntityId, accountId: EntityId): DispatchResult => {
      const event = buildEvent({
        type: "audit.account.reassigned",
        entityId: auditId,
        payload: {
          id: auditId,
          accountId,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  const deleteAudit = useCallback(
    (auditId: EntityId): DispatchResult => {
      const event = buildEvent({
        type: "audit.deleted",
        entityId: auditId,
        payload: {
          id: auditId,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  const cancelAudit = useCallback(
    (auditId: EntityId): DispatchResult => {
      const event = buildEvent({
        type: "audit.canceled",
        entityId: auditId,
        payload: {
          id: auditId,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  const updateAuditDuration = useCallback(
    (auditId: EntityId, durationMinutes: number): DispatchResult => {
      const event = buildEvent({
        type: "audit.duration.updated",
        entityId: auditId,
        payload: {
          id: auditId,
          durationMinutes,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  return {
    createAudit,
    rescheduleAudit,
    completeAudit,
    updateAuditNotes,
    updateAuditFloorsVisited,
    reassignAuditAccount,
    cancelAudit,
    updateAuditDuration,
    deleteAudit,
  };
};
