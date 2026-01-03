import { useCallback } from "react";

import { buildEvent } from "../../events/dispatcher";
import type { EntityLinkType } from "../../domains/relations/entityLink";
import { nextId } from "../../domains/shared/idGenerator";
import type { EntityId } from "../../domains/shared/types";
import type { DispatchResult } from "./useDispatch";
import { useDispatch } from "./useDispatch";

export const useNoteActions = (deviceId: string) => {
  const { dispatch } = useDispatch();

  const createNote = useCallback(
    (title: string, body: string, noteId?: EntityId): DispatchResult => {
      const id = noteId ?? nextId("note");
      const event = buildEvent({
        type: "note.created",
        entityId: id,
        payload: {
          id,
          title,
          body,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  const updateNote = useCallback(
    (noteId: EntityId, title: string, body: string): DispatchResult => {
      const event = buildEvent({
        type: "note.updated",
        entityId: noteId,
        payload: {
          title,
          body,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  const deleteNote = useCallback(
    (noteId: EntityId): DispatchResult => {
      const event = buildEvent({
        type: "note.deleted",
        entityId: noteId,
        payload: {
          id: noteId,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

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

  return {
    createNote,
    updateNote,
    deleteNote,
    linkNote,
    unlinkNote,
  };
};
