// Re-export domain utilities for backwards compatibility
// This allows reducers to continue importing from "./shared" while
// the actual implementation lives in the domain layer where it belongs
export { resolveEntityId } from "../domains/shared/entityUtils";
