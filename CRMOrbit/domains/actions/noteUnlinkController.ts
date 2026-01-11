import type { EntityId, DeviceId } from "@domains/shared/types";
import type { EntityLinkType } from "@domains/relations/entityLink";
import type { EventDispatcher, DispatchResult } from "./entityLinkActions";
import { unlinkNote } from "./entityLinkActions";

export type UnlinkNoteRequest = {
  noteId: EntityId;
  noteTitle: string;
  entityType: EntityLinkType;
  entityId: EntityId;
  linkIdsByNoteId: Map<EntityId, EntityId>;
};

export type UnlinkNoteController = {
  canUnlink: (noteId: EntityId) => boolean;
  executeUnlink: (noteId: EntityId) => DispatchResult | null;
  getConfirmationMessage: (noteTitle: string) => string;
};

/**
 * Creates a controller for unlinking notes from entities.
 * Encapsulates business logic for validation, link lookup, and event dispatch.
 */
export const createNoteUnlinkController = (
  dispatch: EventDispatcher,
  deviceId: DeviceId,
  request: UnlinkNoteRequest,
  t: (key: string) => string,
): UnlinkNoteController => {
  const { linkIdsByNoteId, entityType, entityId } = request;

  return {
    canUnlink: (noteId: EntityId): boolean => {
      return linkIdsByNoteId.has(noteId);
    },

    executeUnlink: (noteId: EntityId): DispatchResult | null => {
      const linkId = linkIdsByNoteId.get(noteId);
      if (!linkId) {
        return null;
      }

      return unlinkNote(dispatch, deviceId, linkId, {
        noteId,
        entityType,
        entityId,
      });
    },

    getConfirmationMessage: (noteTitle: string): string => {
      return t("notes.unlinkConfirmation").replace("{name}", noteTitle);
    },
  };
};
