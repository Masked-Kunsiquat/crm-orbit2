import { useCallback } from "react";

import { buildEvent } from "../events/dispatcher";
import type { EntityId } from "../shared/types";
import { nextId } from "../shared/idGenerator";
import { useDispatch } from "./useDispatch";

export const useOrganizationActions = (deviceId: string) => {
  const { dispatch } = useDispatch();

  const createOrganization = useCallback(
    (name: string, status = "organization.status.active") => {
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

      return dispatch([event]);
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
