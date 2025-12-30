import { useCallback } from "react";

import { buildEvent } from "../events/dispatcher";
import { nextId } from "../shared/idGenerator";
import { useDispatch } from "./useDispatch";

export const useInteractionActions = (deviceId: string) => {
  const { dispatch } = useDispatch();

  const logInteraction = useCallback(
    (
      type: string = "interaction.type.call",
      summary: string,
      occurredAt?: string,
    ) => {
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
    [deviceId],
  );

  return {
    logInteraction,
  };
};
