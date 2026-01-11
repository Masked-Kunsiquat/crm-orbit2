import type { Note } from "./note";

/**
 * Build note state from event payload.
 * Used by both reducers and timeline rendering for consistent state derivation.
 *
 * @param id - Note entity ID
 * @param payload - Event payload (may be partial for updates)
 * @param timestamp - Event timestamp
 * @param existing - Existing note state (for updates)
 * @returns Complete note state
 */
export const buildNoteFromPayload = (
  id: string,
  payload: Record<string, unknown>,
  timestamp: string,
  existing?: Note,
): Note => ({
  id,
  title:
    typeof payload.title === "string" ? payload.title : (existing?.title ?? ""),
  body:
    typeof payload.body === "string" ? payload.body : (existing?.body ?? ""),
  createdAt: existing?.createdAt ?? timestamp,
  updatedAt: timestamp,
});
