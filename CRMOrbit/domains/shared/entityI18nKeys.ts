/**
 * Domain-level i18n key mappings for entity types.
 * Centralizes translation key construction to keep views free of string manipulation.
 */

export type EntityType = "organization" | "account" | "contact";
export type TargetType = "note" | "interaction" | "calendarEvent";

/**
 * Maps entity types to their i18n keys for various contexts
 */
export const ENTITY_I18N_KEYS: Record<
  EntityType,
  {
    title: string;
    linkTitle: string;
    emptyTitle: string;
    emptyHint: string;
  }
> = {
  organization: {
    title: "organizations.title",
    linkTitle: "organizations.linkTitle",
    emptyTitle: "organizations.emptyTitle",
    emptyHint: "organizations.emptyHint",
  },
  account: {
    title: "accounts.title",
    linkTitle: "accounts.linkTitle",
    emptyTitle: "accounts.emptyTitle",
    emptyHint: "accounts.emptyHint",
  },
  contact: {
    title: "contacts.title",
    linkTitle: "contacts.linkTitle",
    emptyTitle: "contacts.emptyTitle",
    emptyHint: "contacts.emptyHint",
  },
};

/**
 * Maps target types (note/interaction, calendarEvent) to their "link to entity" i18n keys
 */
export const TARGET_LINK_TO_ENTITY_KEYS: Record<TargetType, string> = {
  note: "notes.linkToEntity",
  interaction: "interactions.linkToEntity",
  calendarEvent: "calendarEvents.linkToEntity",
};

/**
 * Gets the link title i18n key for an entity type
 */
export const getEntityLinkTitleKey = (entityType: EntityType): string => {
  return ENTITY_I18N_KEYS[entityType].linkTitle;
};

/**
 * Gets the "link to entity" i18n key for a target type
 */
export const getTargetLinkToEntityKey = (targetType: TargetType): string => {
  return TARGET_LINK_TO_ENTITY_KEYS[targetType];
};

/**
 * Gets the empty state i18n keys for an entity type
 */
export const getEntityEmptyStateKeys = (
  entityType: EntityType,
): { title: string; hint: string } => {
  return {
    title: ENTITY_I18N_KEYS[entityType].emptyTitle,
    hint: ENTITY_I18N_KEYS[entityType].emptyHint,
  };
};

/**
 * Gets the title i18n key for an entity type
 */
export const getEntityTitleKey = (entityType: EntityType): string => {
  return ENTITY_I18N_KEYS[entityType].title;
};
