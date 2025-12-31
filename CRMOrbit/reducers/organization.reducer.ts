import type { AutomergeDoc } from "../automerge/schema";
import type { Organization, OrganizationStatus } from "../domains/organization";
import type { Event } from "../events/event";
import type { EntityId } from "../domains/shared/types";
import { resolveEntityId } from "./shared";

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

type OrganizationUpdatedPayload = {
  id: EntityId;
  name?: string;
  status?: OrganizationStatus;
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

const applyOrganizationUpdated = (
  doc: AutomergeDoc,
  event: Event,
): AutomergeDoc => {
  const payload = event.payload as OrganizationUpdatedPayload;
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
        ...(payload.name !== undefined && { name: payload.name }),
        ...(payload.status !== undefined && { status: payload.status }),
        updatedAt: event.timestamp,
      },
    },
  };
};

const applyOrganizationDeleted = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  const payload = event.payload as { id?: EntityId };
  const id = resolveEntityId(event, payload);
  const existing = doc.organizations[id] as Organization | undefined;

  if (!existing) {
    throw new Error(`Organization not found: ${id}`);
  }

  const hasDependentAccounts = Object.values(doc.accounts).some(
    (account) => account.organizationId === id,
  );
  if (hasDependentAccounts) {
    throw new Error(
      `Cannot delete organization ${id}: accounts still reference it`,
    );
  }

  // Remove the organization
  const { [id]: removed, ...remainingOrganizations } = doc.organizations;

  return {
    ...doc,
    organizations: remainingOrganizations,
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
    case "organization.updated":
      return applyOrganizationUpdated(doc, event);
    case "organization.deleted":
      return applyOrganizationDeleted(doc, event);
    default:
      throw new Error(
        `organization.reducer does not handle event type: ${event.type}`,
      );
  }
};
