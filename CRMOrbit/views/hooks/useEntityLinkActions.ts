import { useCallback } from "react";

import type { EntityLinkType } from "../../domains/relations/entityLink";
import type { EntityId } from "../../domains/shared/types";
import type { DispatchResult } from "../../domains/actions";
import {
  linkInteraction as linkInteractionAction,
  linkNote as linkNoteAction,
  unlinkInteraction as unlinkInteractionAction,
  unlinkNote as unlinkNoteAction,
} from "../../domains/actions";
import { useDispatch } from "./useDispatch";

export const useEntityLinkActions = (deviceId: string) => {
  const { dispatch } = useDispatch();

  const linkNote = useCallback(
    (
      noteId: EntityId,
      entityType: EntityLinkType,
      entityId: EntityId,
    ): DispatchResult => {
      return linkNoteAction(dispatch, deviceId, noteId, entityType, entityId);
    },
    [deviceId, dispatch],
  );

  const unlinkNote = useCallback(
    (
      linkId: EntityId,
      payload?: {
        noteId?: EntityId;
        entityType?: EntityLinkType;
        entityId?: EntityId;
      },
    ): DispatchResult => {
      return unlinkNoteAction(dispatch, deviceId, linkId, payload);
    },
    [deviceId, dispatch],
  );

  const linkInteraction = useCallback(
    (
      interactionId: EntityId,
      entityType: EntityLinkType,
      entityId: EntityId,
    ): DispatchResult => {
      return linkInteractionAction(
        dispatch,
        deviceId,
        interactionId,
        entityType,
        entityId,
      );
    },
    [deviceId, dispatch],
  );

  const unlinkInteraction = useCallback(
    (
      linkId: EntityId,
      payload?: {
        interactionId?: EntityId;
        entityType?: EntityLinkType;
        entityId?: EntityId;
      },
    ): DispatchResult => {
      return unlinkInteractionAction(dispatch, deviceId, linkId, payload);
    },
    [deviceId, dispatch],
  );

  return {
    linkNote,
    unlinkNote,
    linkInteraction,
    unlinkInteraction,
  };
};
