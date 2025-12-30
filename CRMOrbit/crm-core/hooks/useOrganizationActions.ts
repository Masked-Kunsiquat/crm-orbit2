import { useCallback } from "react";

import { buildEvent } from "../events/dispatcher";
import { nextId } from "../shared/idGenerator";
import type { EntityId } from "../shared/types";
import type { DispatchResult } from "./useDispatch";
import { useDispatch } from "./useDispatch";

export const useOrganizationActions = (deviceId: string) => {
  const { dispatch } = useDispatch();

  const createOrganization = useCallback(
    (
      name: string,
      status = "organization.status.active",
    ): DispatchResult & { id: string } => {
      const id = nextId("org");
      const event = buildEvent({
        type: "organization.created",
        entityId: id,
        payload: {
          id,
          name,
          status,
          metadata: {},
        },
        deviceId,
      });

      const result = dispatch([event]);
      return { ...result, id };
    },
    [deviceId],
  );

  const updateOrganizationStatus = useCallback(
    (organizationId: EntityId, status: string) => {
      const event = buildEvent({
        type: "organization.status.updated",
        entityId: organizationId,
        payload: {
          status,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId],
  );

  return {
    createOrganization,
    updateOrganizationStatus,
  };
};
