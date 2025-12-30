import type { Event } from "../events/event";
import type { Organization, OrganizationStatus } from "../domains/organization";
import type { AutomergeDoc } from "../automerge/schema";
import type { EntityId } from "../shared/types";

type OrganizationCreatedPayload = {
  id: EntityId;
  name: string;
  status: OrganizationStatus;
  metadata?: Record<string, unknown>;
};

type OrganizationStatusUpdatedPayload = {
  id: EntityId;
  status: OrganizationStatus;
};

const resolveEntityId = <T extends { id?: EntityId }>(
  event: Event,
  payload: T,
): EntityId => {
  if (payload.id && event.entityId && payload.id !== event.entityId) {
    throw new Error(
      `Event entityId mismatch: payload=${payload.id}, event=${event.entityId}`,
    );
  }

  const entityId = payload.id ?? event.entityId;

  if (!entityId) {
    throw new Error("Event entityId is required.");
  }

  return entityId;
};

const applyOrganizationCreated = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as OrganizationCreatedPayload;
  const id = resolveEntityId(event, payload);

  if (doc.organizations[id]) {
    throw new Error(`Organization already exists: ${id}`);
  }

  const organization: Organization = {
    id,
    name: payload.name,
    status: payload.status,
    metadata: payload.metadata,
    createdAt: event.timestamp,
    updatedAt: event.timestamp,
  };

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

export const organizationReducer = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  switch (event.type) {
    case "organization.created":
      return applyOrganizationCreated(doc, event);
    case "organization.status.updated":
      return applyOrganizationStatusUpdated(doc, event);
    default:
      throw new Error(
        `organization.reducer does not handle event type: ${event.type}`,
      );
  }
};
