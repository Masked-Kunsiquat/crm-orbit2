import { useCallback } from "react";

import { buildEvent } from "../../events/dispatcher";
import { nextId } from "../../domains/shared/idGenerator";
import type { DispatchResult } from "./useDispatch";
import { useDispatch } from "./useDispatch";

export const useInteractionActions = (deviceId: string) => {
  const { dispatch } = useDispatch();

  const logInteraction = useCallback(
    (
      type: string = "interaction.type.call",
      summary: string,
      occurredAt?: string,
    ): DispatchResult & { id: string } => {
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

      const result = dispatch([event]);
      return { ...result, id };
    },
    [deviceId],
  );

  return {
    logInteraction,
  };
};
