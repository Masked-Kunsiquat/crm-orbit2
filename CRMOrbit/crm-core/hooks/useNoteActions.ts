import { useCallback } from "react";

import { buildEvent } from "../events/dispatcher";
import type { NoteLinkEntityType } from "../relations/noteLink";
import type { EntityId } from "../shared/types";
import { nextId } from "../shared/idGenerator";
import { useDispatch } from "./useDispatch";

export const useNoteActions = (deviceId: string) => {
  const { dispatch } = useDispatch();

  const createNote = useCallback(
    (title: string, body: string) => {
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

      return dispatch([event]);
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

  const linkNote = useCallback(
    (noteId: EntityId, entityType: NoteLinkEntityType, entityId: EntityId) => {
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

      return dispatch([event]);
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
    linkNote,
    unlinkNote,
  };
};
