import type { EntityId, DeviceId } from "@domains/shared/types";
import type { EntityLinkType } from "@domains/relations/entityLink";
import type { EventDispatcher, DispatchResult } from "./entityLinkActions";
import { unlinkInteraction } from "./entityLinkActions";

export type UnlinkInteractionRequest = {
  interactionId: EntityId;
  interactionSummary: string;
  entityType: EntityLinkType;
  entityId: EntityId;
  linkIdsByInteractionId: Map<EntityId, EntityId>;
};

export type UnlinkInteractionController = {
  canUnlink: (interactionId: EntityId) => boolean;
  executeUnlink: (interactionId: EntityId) => DispatchResult | null;
  getConfirmationMessage: (interactionSummary: string) => string;
};

/**
 * Creates a controller for unlinking interactions from entities.
 * Encapsulates business logic for validation, link lookup, and event dispatch.
 */
export const createInteractionUnlinkController = (
  dispatch: EventDispatcher,
  deviceId: DeviceId,
  request: UnlinkInteractionRequest,
  t: (key: string) => string,
): UnlinkInteractionController => {
  const { linkIdsByInteractionId, entityType, entityId } = request;

  return {
    canUnlink: (interactionId: EntityId): boolean => {
      return linkIdsByInteractionId.has(interactionId);
    },

    executeUnlink: (interactionId: EntityId): DispatchResult | null => {
      const linkId = linkIdsByInteractionId.get(interactionId);
      if (!linkId) {
        return null;
      }

      return unlinkInteraction(dispatch, deviceId, linkId, {
        interactionId,
        entityType,
        entityId,
      });
    },

    getConfirmationMessage: (interactionSummary: string): string => {
      return t("interactions.unlinkConfirmation").replace(
        "{name}",
        interactionSummary,
      );
    },
  };
};
