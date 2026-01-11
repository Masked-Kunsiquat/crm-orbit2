import { useMemo } from "react";
import type { EntityId } from "@domains/shared/types";
import type { EntityLinkType } from "@domains/relations/entityLink";
import {
  createNoteUnlinkController,
  type UnlinkNoteController,
} from "@domains/actions";
import { t } from "@i18n/index";
import { useDispatch } from "./useDispatch";

type UseNoteUnlinkParams = {
  entityType: EntityLinkType;
  entityId: EntityId;
  linkIdsByNoteId: Map<EntityId, EntityId>;
  deviceId: string;
};

/**
 * Hook that provides a controller for unlinking notes from entities.
 * Encapsulates all business logic, event dispatch, and i18n.
 */
export const useNoteUnlink = ({
  entityType,
  entityId,
  linkIdsByNoteId,
  deviceId,
}: UseNoteUnlinkParams): UnlinkNoteController => {
  const { dispatch } = useDispatch();

  return useMemo(
    () =>
      createNoteUnlinkController(
        dispatch,
        deviceId,
        {
          noteId: "", // Not needed at controller creation time
          noteTitle: "", // Not needed at controller creation time
          entityType,
          entityId,
          linkIdsByNoteId,
        },
        t,
      ),
    [dispatch, deviceId, entityType, entityId, linkIdsByNoteId],
  );
};
