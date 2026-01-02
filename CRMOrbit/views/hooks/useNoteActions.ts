/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback } from "react";

import { buildEvent } from "../../events/dispatcher";
import type { NoteLinkEntityType } from "../../domains/relations/noteLink";
import { nextId } from "../../domains/shared/idGenerator";
import type { EntityId } from "../../domains/shared/types";
import type { DispatchResult } from "./useDispatch";
import { useDispatch } from "./useDispatch";

export const useNoteActions = (deviceId: string) => {
  const { dispatch } = useDispatch();

  const createNote = useCallback(
    (title: string, body: string): DispatchResult & { id: string } => {
      const id = nextId("note");
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

      const result = dispatch([event]);
      return { ...result, id };
    },
    [deviceId],
  );

  const updateNote = useCallback(
    (noteId: EntityId, title: string, body: string) => {
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
    [deviceId],
  );

  const deleteNote = useCallback(
    (noteId: EntityId) => {
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
    [deviceId],
  );

  const linkNote = useCallback(
    (
      noteId: EntityId,
      entityType: NoteLinkEntityType,
      entityId: EntityId,
    ): DispatchResult & { id: string } => {
      const id = nextId("noteLink");
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

      const result = dispatch([event]);
      return { ...result, id };
    },
    [deviceId],
  );

  const unlinkNote = useCallback(
    (linkId: EntityId) => {
      const event = buildEvent({
        type: "note.unlinked",
        entityId: linkId,
        payload: {},
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId],
  );

  return {
    createNote,
    updateNote,
    deleteNote,
    linkNote,
    unlinkNote,
  };
};
