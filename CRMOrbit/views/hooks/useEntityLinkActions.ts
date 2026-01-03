import { useCallback } from "react";

import { buildEvent } from "../../events/dispatcher";
import type { EntityLinkType } from "../../domains/relations/entityLink";
import { nextId } from "../../domains/shared/idGenerator";
import type { EntityId } from "../../domains/shared/types";
import type { DispatchResult } from "./useDispatch";
import { useDispatch } from "./useDispatch";

export const useEntityLinkActions = (deviceId: string) => {
  const { dispatch } = useDispatch();

  const linkNote = useCallback(
    (
      noteId: EntityId,
      entityType: EntityLinkType,
      entityId: EntityId,
    ): DispatchResult => {
      const id = nextId("entityLink");
      const event = buildEvent({
        type: "note.linked",
        entityId: id,
        payload: {
          id,
          noteId,
          entityType,
          entityId,
        },
        deviceId,
      });

      return dispatch([event]);
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
      const event = buildEvent({
        type: "note.unlinked",
        entityId: linkId,
        payload: payload ?? {},
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  const linkInteraction = useCallback(
    (
      interactionId: EntityId,
      entityType: EntityLinkType,
      entityId: EntityId,
    ): DispatchResult => {
      const id = nextId("entityLink");
      const event = buildEvent({
        type: "interaction.linked",
        entityId: id,
        payload: {
          id,
          interactionId,
          entityType,
          entityId,
        },
        deviceId,
      });

      return dispatch([event]);
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
      const event = buildEvent({
        type: "interaction.unlinked",
        entityId: linkId,
        payload: payload ?? {},
        deviceId,
      });

      return dispatch([event]);
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
