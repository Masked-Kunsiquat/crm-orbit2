import { useCallback } from "react";

import { buildEvent } from "../../events/dispatcher";
import { nextId } from "../../domains/shared/idGenerator";
import type { EntityId } from "../../domains/shared/types";
import type {
  Organization,
  SocialMediaLinks,
} from "../../domains/organization";
import type { DispatchResult } from "./useDispatch";
import { useDispatch } from "./useDispatch";

export const useOrganizationActions = (deviceId: string) => {
  const { dispatch } = useDispatch();

  const createOrganization = useCallback(
    (
      name: string,
      status = "organization.status.active",
      logoUri?: string,
      website?: string,
      socialMedia?: SocialMediaLinks,
    ): DispatchResult => {
      const id = nextId("org");
      const event = buildEvent({
        type: "organization.created",
        entityId: id,
        payload: {
          id,
          name,
          status,
          logoUri,
          website,
          socialMedia,
          metadata: {},
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  const updateOrganizationStatus = useCallback(
    (organizationId: EntityId, status: string): DispatchResult => {
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
    [deviceId, dispatch],
  );

  const updateOrganization = useCallback(
    (
      organizationId: EntityId,
      name: string,
      status: string,
      logoUri?: string,
      website?: string,
      socialMedia?: SocialMediaLinks,
      _previousOrganization?: Organization, // Kept for backwards compatibility, unused since change detection moved to view layer
    ): DispatchResult => {
      const event = buildEvent({
        type: "organization.updated",
        entityId: organizationId,
        payload: {
          name,
          status,
          logoUri: logoUri ?? null,
          website,
          socialMedia,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  const deleteOrganization = useCallback(
    (organizationId: EntityId): DispatchResult => {
      const event = buildEvent({
        type: "organization.deleted",
        entityId: organizationId,
        payload: {
          id: organizationId,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  return {
    createOrganization,
    updateOrganizationStatus,
    updateOrganization,
    deleteOrganization,
  };
};
