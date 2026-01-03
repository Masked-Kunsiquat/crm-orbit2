import type { Event } from "@events/event";
import type { EntityLinkType } from "@domains/relations/entityLink";
import type { DeviceId, EntityId } from "@domains/shared/types";
import { nextId } from "@domains/shared/idGenerator";

import { buildTypedEvent } from "./eventBuilder";

export type DispatchResult = {
  success: boolean;
  error?: string;
};

export type EventDispatcher = (events: Event[]) => DispatchResult;

export type UnlinkNotePayload = {
  noteId?: EntityId;
  entityType?: EntityLinkType;
  entityId?: EntityId;
};

export type UnlinkInteractionPayload = {
  interactionId?: EntityId;
  entityType?: EntityLinkType;
  entityId?: EntityId;
};

export const linkNote = (
  dispatch: EventDispatcher,
  deviceId: DeviceId,
  noteId: EntityId,
  entityType: EntityLinkType,
  entityId: EntityId,
): DispatchResult => {
  const id = nextId("entityLink");
  const event = buildTypedEvent({
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
};

export const unlinkNote = (
  dispatch: EventDispatcher,
  deviceId: DeviceId,
  linkId: EntityId,
  payload?: UnlinkNotePayload,
): DispatchResult => {
  const event = buildTypedEvent({
    type: "note.unlinked",
    entityId: linkId,
    payload: payload ?? {},
    deviceId,
  });

  return dispatch([event]);
};

export const linkInteraction = (
  dispatch: EventDispatcher,
  deviceId: DeviceId,
  interactionId: EntityId,
  entityType: EntityLinkType,
  entityId: EntityId,
): DispatchResult => {
  const id = nextId("entityLink");
  const event = buildTypedEvent({
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
};

export const unlinkInteraction = (
  dispatch: EventDispatcher,
  deviceId: DeviceId,
  linkId: EntityId,
  payload?: UnlinkInteractionPayload,
): DispatchResult => {
  const event = buildTypedEvent({
    type: "interaction.unlinked",
    entityId: linkId,
    payload: payload ?? {},
    deviceId,
  });

  return dispatch([event]);
};
