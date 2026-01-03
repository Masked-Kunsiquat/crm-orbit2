import type { AutomergeDoc } from "../automerge/schema";
import type {
  Organization,
  OrganizationStatus,
  SocialMediaLinks,
} from "../domains/organization";
import type { Event } from "../events/event";
import type { EntityId } from "../domains/shared/types";
import { resolveEntityId } from "./shared";
import { createLogger } from "../utils/logger";

const logger = createLogger("OrganizationReducer");

type OrganizationCreatedPayload = {
  id: EntityId;
  name: string;
  status: OrganizationStatus;
  logoUri?: string;
  website?: string;
  socialMedia?: SocialMediaLinks;
  metadata?: Record<string, unknown>;
};

type OrganizationStatusUpdatedPayload = {
  id: EntityId;
  status: OrganizationStatus;
};

type OrganizationUpdatedPayload = {
  id: EntityId;
  name?: string;
  status?: OrganizationStatus;
  logoUri?: string;
  website?: string;
  socialMedia?: SocialMediaLinks;
};

const applyOrganizationCreated = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as OrganizationCreatedPayload;
  const id = resolveEntityId(event, payload);

  logger.debug("Creating organization", { id, name: payload.name });

  if (doc.organizations[id]) {
    logger.error("Organization already exists", { id });
    throw new Error(`Organization already exists: ${id}`);
  }

  const organization: Organization = {
    id,
    name: payload.name,
    status: payload.status,
    logoUri: payload.logoUri,
    website: payload.website,
    socialMedia: payload.socialMedia,
    metadata: payload.metadata,
    createdAt: event.timestamp,
    updatedAt: event.timestamp,
  };

  logger.info("Organization created", {
    id,
    name: payload.name,
    status: payload.status,
  });

  return {
    ...doc,
    organizations: {
      ...doc.organizations,
      [id]: organization,
    },
  };
};

const applyOrganizationStatusUpdated = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as OrganizationStatusUpdatedPayload;
  const id = resolveEntityId(event, payload);
  const existing = doc.organizations[id] as Organization | undefined;

  if (!existing) {
    throw new Error(`Organization not found: ${id}`);
  }

  return {
    ...doc,
    organizations: {
      ...doc.organizations,
      [id]: {
        ...existing,
        status: payload.status,
        updatedAt: event.timestamp,
      },
    },
  };
};

const applyOrganizationUpdated = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as OrganizationUpdatedPayload;
  const id = resolveEntityId(event, payload);
  const existing = doc.organizations[id] as Organization | undefined;

  if (!existing) {
    logger.error("Organization not found for update", { id });
    throw new Error(`Organization not found: ${id}`);
  }

  logger.debug("Updating organization", { id, updates: payload });

  const updated: Organization = {
    ...existing,
    updatedAt: event.timestamp,
  };

  // Only update fields that are present in the payload
  if (payload.name !== undefined) {
    updated.name = payload.name;
  }
  if (payload.status !== undefined) {
    updated.status = payload.status;
  }
  if (payload.website !== undefined) {
    updated.website = payload.website;
  }
  if (payload.socialMedia !== undefined) {
    updated.socialMedia = payload.socialMedia;
  }
  // logoUri can be explicitly set to undefined to clear it
  if ("logoUri" in payload) {
    updated.logoUri = payload.logoUri;
  }

  return {
    ...doc,
    organizations: {
      ...doc.organizations,
      [id]: updated,
    },
  };
};

const applyOrganizationDeleted = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as { id?: EntityId };
  const id = resolveEntityId(event, payload);
  const existing = doc.organizations[id] as Organization | undefined;

  if (!existing) {
    logger.error("Organization not found for deletion", { id });
    throw new Error(`Organization not found: ${id}`);
  }

  const hasDependentAccounts = Object.values(doc.accounts).some(
    (account) => account.organizationId === id,
  );
  if (hasDependentAccounts) {
    logger.warn("Cannot delete organization with dependent accounts", { id });
    throw new Error(
      `Cannot delete organization ${id}: accounts still reference it`,
    );
  }

  logger.info("Organization deleted", { id });

  // Remove the organization
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [id]: _removed, ...remainingOrganizations } = doc.organizations;

  return {
    ...doc,
    organizations: remainingOrganizations,
  };
};

export const organizationReducer = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  logger.debug("Processing event", {
    type: event.type,
    entityId: event.entityId,
  });

  switch (event.type) {
    case "organization.created":
      return applyOrganizationCreated(doc, event);
    case "organization.status.updated":
      return applyOrganizationStatusUpdated(doc, event);
    case "organization.updated":
      return applyOrganizationUpdated(doc, event);
    case "organization.deleted":
      return applyOrganizationDeleted(doc, event);
    default:
      logger.error("Unhandled event type", { type: event.type });
      throw new Error(
        `organization.reducer does not handle event type: ${event.type}`,
      );
  }
};
