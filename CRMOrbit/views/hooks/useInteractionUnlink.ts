import { useMemo } from "react";
import type { EntityId } from "@domains/shared/types";
import type { EntityLinkType } from "@domains/relations/entityLink";
import {
  createInteractionUnlinkController,
  type UnlinkInteractionController,
} from "@domains/actions";
import { t } from "@i18n/index";
import { useDispatch } from "./useDispatch";

type UseInteractionUnlinkParams = {
  entityType: EntityLinkType;
  entityId: EntityId;
  linkIdsByInteractionId: Map<EntityId, EntityId>;
  deviceId: string;
};

/**
 * Hook that provides a controller for unlinking interactions from entities.
 * Encapsulates all business logic, event dispatch, and i18n.
 */
export const useInteractionUnlink = ({
  entityType,
  entityId,
  linkIdsByInteractionId,
  deviceId,
}: UseInteractionUnlinkParams): UnlinkInteractionController => {
  const { dispatch } = useDispatch();

  return useMemo(
    () =>
      createInteractionUnlinkController(
        dispatch,
        deviceId,
        {
          interactionId: "", // Not needed at controller creation time
          interactionSummary: "", // Not needed at controller creation time
          entityType,
          entityId,
          linkIdsByInteractionId,
        },
        t,
      ),
    [dispatch, deviceId, entityType, entityId, linkIdsByInteractionId],
  );
};
