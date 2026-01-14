import { useMemo } from "react";
import type { EntityId } from "@domains/shared/types";
import type { EntityLink } from "@domains/relations/entityLink";
import { useDoc } from "../store/store";

/**
 * Build a map from linked entity IDs to their link IDs for a specific entity.
 *
 * This hook eliminates duplication in section components that need to look up
 * link IDs for unlinking operations. Instead of 14 lines of duplicate memoization
 * logic, components can use this single hook.
 *
 * @param linkType - The type of linked entity ("note", "interaction", or "calendarEvent")
 * @param entityType - The parent entity type (e.g., "account", "contact")
 * @param entityId - The parent entity ID
 * @returns Map from linked entity ID to link ID
 *
 * @example
 * ```ts
 * // In NotesSection:
 * const linkIdsByNoteId = useEntityLinkMap("note", entityType, entityId);
 * const linkId = linkIdsByNoteId.get(noteId);
 * if (linkId) unlinkNote(linkId);
 * ```
 */
export const useEntityLinkMap = (
  linkType: "note" | "interaction" | "calendarEvent",
  entityType: string,
  entityId: EntityId,
): Map<EntityId, EntityId> => {
  const doc = useDoc();

  return useMemo(() => {
    const map = new Map<EntityId, EntityId>();
    const idKey = `${linkType}Id` as const;

    for (const [linkId, link] of Object.entries(doc.relations.entityLinks)) {
      const typedLink = link as EntityLink;
      if (
        typedLink.linkType === linkType &&
        typedLink[idKey] &&
        typedLink.entityType === entityType &&
        typedLink.entityId === entityId
      ) {
        map.set(typedLink[idKey] as EntityId, linkId);
      }
    }

    return map;
  }, [doc.relations.entityLinks, linkType, entityType, entityId]);
};
