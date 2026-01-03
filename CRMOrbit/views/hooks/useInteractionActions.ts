import { useCallback } from "react";

import { buildEvent } from "../../events/dispatcher";
import type { Interaction, InteractionType } from "../../domains/interaction";
import { nextId } from "../../domains/shared/idGenerator";
import type { EntityId } from "../../domains/shared/types";
import type { DispatchResult } from "./useDispatch";
import { useDispatch } from "./useDispatch";
import { detectInteractionChanges } from "../../utils/historyChanges";

export const useInteractionActions = (deviceId: string) => {
  const { dispatch } = useDispatch();

  const logInteraction = useCallback(
    (
      type: InteractionType = "interaction.type.call",
      summary: string,
      occurredAt?: string,
    ): DispatchResult => {
      const id = nextId("interaction");
      const event = buildEvent({
        type: "interaction.logged",
        entityId: id,
        payload: {
          id,
          type,
          occurredAt: occurredAt ?? new Date().toISOString(),
          summary,
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
      previousInteraction?: Interaction,
    ): DispatchResult => {
      const changes = previousInteraction
        ? detectInteractionChanges(previousInteraction, {
            type,
            summary,
            occurredAt,
          })
        : undefined;

      const event = buildEvent({
        type: "interaction.updated",
        entityId: interactionId,
        payload: {
          type,
          summary,
          occurredAt,
          ...(changes && changes.length > 0 && { changes }),
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
    deleteInteraction,
  };
};
