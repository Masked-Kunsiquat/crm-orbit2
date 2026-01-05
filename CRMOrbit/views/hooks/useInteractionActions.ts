import { useCallback } from "react";

import { buildEvent } from "../../events/dispatcher";
import type {
  InteractionStatus,
  InteractionType,
} from "../../domains/interaction";
import { nextId } from "../../domains/shared/idGenerator";
import type { EntityId } from "../../domains/shared/types";
import type { DispatchResult } from "./useDispatch";
import { useDispatch } from "./useDispatch";

export const useInteractionActions = (deviceId: string) => {
  const { dispatch } = useDispatch();

  const logInteraction = useCallback(
    (
      type: InteractionType = "interaction.type.call",
      summary: string,
      occurredAt?: string,
      durationMinutes?: number,
      interactionId?: EntityId,
    ): DispatchResult => {
      const id = interactionId ?? nextId("interaction");
      const event = buildEvent({
        type: "interaction.logged",
        entityId: id,
        payload: {
          id,
          type,
          occurredAt: occurredAt ?? new Date().toISOString(),
          summary,
          ...(durationMinutes !== undefined && { durationMinutes }),
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  const updateInteraction = useCallback(
    (
      interactionId: EntityId,
      type: InteractionType,
      summary: string,
      occurredAt: string,
      durationMinutes?: number,
    ): DispatchResult => {
      const event = buildEvent({
        type: "interaction.updated",
        entityId: interactionId,
        payload: {
          type,
          summary,
          occurredAt,
          ...(durationMinutes !== undefined && { durationMinutes }),
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  const scheduleInteraction = useCallback(
    (
      type: InteractionType,
      summary: string,
      scheduledFor: string,
      durationMinutes?: number,
      interactionId?: EntityId,
    ): DispatchResult => {
      const id = interactionId ?? nextId("interaction");
      const event = buildEvent({
        type: "interaction.scheduled",
        entityId: id,
        payload: {
          id,
          type,
          scheduledFor,
          summary,
          ...(durationMinutes !== undefined && { durationMinutes }),
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  const rescheduleInteraction = useCallback(
    (interactionId: EntityId, scheduledFor: string): DispatchResult => {
      const event = buildEvent({
        type: "interaction.rescheduled",
        entityId: interactionId,
        payload: {
          id: interactionId,
          scheduledFor,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  const updateInteractionStatus = useCallback(
    (
      interactionId: EntityId,
      status: InteractionStatus,
      occurredAt?: string,
    ): DispatchResult => {
      const event = buildEvent({
        type: "interaction.status.updated",
        entityId: interactionId,
        payload: {
          id: interactionId,
          status,
          ...(occurredAt !== undefined && { occurredAt }),
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  const deleteInteraction = useCallback(
    (interactionId: EntityId): DispatchResult => {
      const event = buildEvent({
        type: "interaction.deleted",
        entityId: interactionId,
        payload: {
          id: interactionId,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  return {
    logInteraction,
    updateInteraction,
    scheduleInteraction,
    rescheduleInteraction,
    updateInteractionStatus,
    deleteInteraction,
  };
};
