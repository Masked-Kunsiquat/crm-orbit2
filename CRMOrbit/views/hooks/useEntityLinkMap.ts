import { useMemo } from "react";
import type { EntityId } from "@domains/shared/types";
import { useCrmStore } from "../store/store";

/**
 * Build a map from linked entity IDs to their link IDs for a specific entity.
 *
 * This hook eliminates duplication in section components that need to look up
 * link IDs for unlinking operations. Instead of 14 lines of duplicate memoization
 * logic, components can use this single hook.
 *
 * @param linkType - The type of linked entity ("note" or "interaction")
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
  linkType: "note" | "interaction",
  entityType: string,
  entityId: EntityId,
): Map<EntityId, EntityId> => {
  const { doc } = useCrmStore();

  return useMemo(() => {
    const map = new Map<EntityId, EntityId>();
    const idKey = `${linkType}Id` as const;

    for (const [linkId, link] of Object.entries(doc.relations.entityLinks)) {
      if (
        link.linkType === linkType &&
        link[idKey] &&
        link.entityType === entityType &&
        link.entityId === entityId
      ) {
        map.set(link[idKey] as EntityId, linkId);
      }
    }

    return map;
  }, [doc.relations.entityLinks, linkType, entityType, entityId]);
};
