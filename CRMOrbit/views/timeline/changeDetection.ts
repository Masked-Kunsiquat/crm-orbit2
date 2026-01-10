import type { Contact, ContactMethod } from "@domains/contact";
import type { Account, AccountAddresses } from "@domains/account";
import type { Organization, SocialMediaLinks } from "@domains/organization";
import type { Note } from "@domains/note";
import type { Interaction, InteractionType } from "@domains/interaction";
import type { Timestamp } from "@domains/shared/types";

export type FieldChange = {
  field: string;
  oldValue: string;
  newValue: string;
};

/**
 * Detects changes in contact method arrays
 */
const detectMethodChanges = (
  oldMethods: ContactMethod[],
  newMethods: ContactMethod[],
  methodType: "email" | "phone",
): FieldChange[] => {
  const changes: FieldChange[] = [];

  // Create maps for easier lookup by ID
  const oldMap = new Map(oldMethods.map((m) => [m.id, m]));
  const newMap = new Map(newMethods.map((m) => [m.id, m]));

  // Check for updated or removed methods
  oldMethods.forEach((oldMethod) => {
    const newMethod = newMap.get(oldMethod.id);

    if (!newMethod) {
      // Method was removed
      changes.push({
        field: methodType,
        oldValue: oldMethod.value,
        newValue: "",
      });
    } else if (
      oldMethod.value !== newMethod.value ||
      oldMethod.label !== newMethod.label ||
      oldMethod.extension !== newMethod.extension
    ) {
      // Method was updated
      if (oldMethod.value !== newMethod.value) {
        changes.push({
          field: methodType,
          oldValue: oldMethod.value,
          newValue: newMethod.value,
        });
      }
      if (oldMethod.label !== newMethod.label) {
        changes.push({
          field: `${methodType}_label`,
          oldValue: oldMethod.label,
          newValue: newMethod.label,
        });
      }
      if (oldMethod.extension !== newMethod.extension) {
        changes.push({
          field: `${methodType}_extension`,
          oldValue: oldMethod.extension ?? "",
          newValue: newMethod.extension ?? "",
        });
      }
    }
  });

  // Check for added methods
  newMethods.forEach((newMethod) => {
    if (!oldMap.has(newMethod.id)) {
      changes.push({
        field: methodType,
        oldValue: "",
        newValue: newMethod.value,
      });
    }
  });

  return changes;
};

/**
 * Detects changes between an old contact and new contact data
 */
export const detectContactChanges = (
  oldContact: Contact,
  newData: {
    firstName: string;
    lastName: string;
    type: string;
    title?: string;
    methods?: {
      emails: ContactMethod[];
      phones: ContactMethod[];
    };
  },
): FieldChange[] => {
  const changes: FieldChange[] = [];

  if (oldContact.firstName !== newData.firstName) {
    changes.push({
      field: "firstName",
      oldValue: oldContact.firstName,
      newValue: newData.firstName,
    });
  }

  if (oldContact.lastName !== newData.lastName) {
    changes.push({
      field: "lastName",
      oldValue: oldContact.lastName,
      newValue: newData.lastName,
    });
  }

  if (oldContact.type !== newData.type) {
    changes.push({
      field: "type",
      oldValue: oldContact.type,
      newValue: newData.type,
    });
  }

  const oldTitle = oldContact.title || "";
  const newTitle = newData.title || "";
  if (oldTitle !== newTitle) {
    changes.push({
      field: "title",
      oldValue: oldTitle,
      newValue: newTitle,
    });
  }

  // Detect method changes if provided
  if (newData.methods) {
    const emailChanges = detectMethodChanges(
      oldContact.methods.emails,
      newData.methods.emails,
      "email",
    );
    const phoneChanges = detectMethodChanges(
      oldContact.methods.phones,
      newData.methods.phones,
      "phone",
    );
    changes.push(...emailChanges, ...phoneChanges);
  }

  return changes;
};

/**
 * Detects changes between an old account and new account data
 */
export const detectAccountChanges = (
  oldAccount: Account,
  newData: {
    name: string;
    status: string;
    website?: string;
    addresses?: AccountAddresses;
    socialMedia?: SocialMediaLinks;
    minFloor?: number;
    maxFloor?: number;
    excludedFloors?: number[];
    auditFrequency?: string;
    auditFrequencyPending?: string;
  },
): FieldChange[] => {
  const changes: FieldChange[] = [];

  if (oldAccount.name !== newData.name) {
    changes.push({
      field: "name",
      oldValue: oldAccount.name,
      newValue: newData.name,
    });
  }

  if (oldAccount.status !== newData.status) {
    changes.push({
      field: "status",
      oldValue: oldAccount.status,
      newValue: newData.status,
    });
  }

  const oldWebsite = oldAccount.website || "";
  const newWebsite = newData.website || "";
  if (oldWebsite !== newWebsite) {
    changes.push({
      field: "website",
      oldValue: oldWebsite,
      newValue: newWebsite,
    });
  }

  const oldFrequency = oldAccount.auditFrequency ?? "";
  const newFrequency = newData.auditFrequency ?? "";
  if (oldFrequency !== newFrequency) {
    changes.push({
      field: "auditFrequency",
      oldValue: oldFrequency,
      newValue: newFrequency,
    });
  }
  const oldPendingFrequency = oldAccount.auditFrequencyPending ?? "";
  const newPendingFrequency = newData.auditFrequencyPending ?? "";
  if (oldPendingFrequency !== newPendingFrequency) {
    changes.push({
      field: "auditFrequencyPending",
      oldValue: oldPendingFrequency,
      newValue: newPendingFrequency,
    });
  }

  // Check site address changes
  if (newData.addresses) {
    const oldSite = oldAccount.addresses?.site;
    const newSite = newData.addresses.site;

    if (oldSite?.street !== newSite?.street) {
      changes.push({
        field: "siteAddress",
        oldValue: oldSite?.street || "",
        newValue: newSite?.street || "",
      });
    }
  }

  // Check social media changes
  if (newData.socialMedia) {
    const oldSocial = oldAccount.socialMedia || {};
    const newSocial = newData.socialMedia;

    const platforms: Array<keyof SocialMediaLinks> = [
      "x",
      "linkedin",
      "facebook",
      "instagram",
    ];

    platforms.forEach((platform) => {
      const oldValue = oldSocial[platform] || "";
      const newValue = newSocial[platform] || "";
      if (oldValue !== newValue) {
        changes.push({
          field: platform,
          oldValue,
          newValue,
        });
      }
    });
  }

  const oldMin = oldAccount.minFloor ?? null;
  const newMin = newData.minFloor ?? null;
  if (oldMin !== newMin) {
    changes.push({
      field: "minFloor",
      oldValue: oldMin === null ? "" : `${oldMin}`,
      newValue: newMin === null ? "" : `${newMin}`,
    });
  }

  const oldMax = oldAccount.maxFloor ?? null;
  const newMax = newData.maxFloor ?? null;
  if (oldMax !== newMax) {
    changes.push({
      field: "maxFloor",
      oldValue: oldMax === null ? "" : `${oldMax}`,
      newValue: newMax === null ? "" : `${newMax}`,
    });
  }

  const oldExcluded = oldAccount.excludedFloors ?? [];
  const newExcluded = newData.excludedFloors ?? [];
  if (oldExcluded.join(",") !== newExcluded.join(",")) {
    changes.push({
      field: "excludedFloors",
      oldValue: oldExcluded.join(", "),
      newValue: newExcluded.join(", "),
    });
  }

  return changes;
};

/**
 * Detects changes between an old organization and new organization data
 */
export const detectOrganizationChanges = (
  oldOrganization: Organization,
  newData: {
    name: string;
    status: string;
    website?: string;
    socialMedia?: SocialMediaLinks;
  },
): FieldChange[] => {
  const changes: FieldChange[] = [];

  if (oldOrganization.name !== newData.name) {
    changes.push({
      field: "name",
      oldValue: oldOrganization.name,
      newValue: newData.name,
    });
  }

  if (oldOrganization.status !== newData.status) {
    changes.push({
      field: "status",
      oldValue: oldOrganization.status,
      newValue: newData.status,
    });
  }

  const oldWebsite = oldOrganization.website || "";
  const newWebsite = newData.website || "";
  if (oldWebsite !== newWebsite) {
    changes.push({
      field: "website",
      oldValue: oldWebsite,
      newValue: newWebsite,
    });
  }

  // Check social media changes
  if (newData.socialMedia) {
    const oldSocial = oldOrganization.socialMedia || {};
    const newSocial = newData.socialMedia;

    const platforms: Array<keyof SocialMediaLinks> = [
      "x",
      "linkedin",
      "facebook",
      "instagram",
    ];

    platforms.forEach((platform) => {
      const oldValue = oldSocial[platform] || "";
      const newValue = newSocial[platform] || "";
      if (oldValue !== newValue) {
        changes.push({
          field: platform,
          oldValue,
          newValue,
        });
      }
    });
  }

  return changes;
};

/**
 * Detects changes between an old note and new note data
 */
export const detectNoteChanges = (
  oldNote: Note,
  newData: {
    title: string;
    body: string;
  },
): FieldChange[] => {
  const changes: FieldChange[] = [];

  if (oldNote.title !== newData.title) {
    changes.push({
      field: "title",
      oldValue: oldNote.title,
      newValue: newData.title,
    });
  }

  if (oldNote.body !== newData.body) {
    changes.push({
      field: "body",
      oldValue: oldNote.body,
      newValue: newData.body,
    });
  }

  return changes;
};

/**
 * Detects changes between an old interaction and new interaction data
 */
export const detectInteractionChanges = (
  oldInteraction: Interaction,
  newData: {
    type: InteractionType;
    summary: string;
    occurredAt: Timestamp;
  },
): FieldChange[] => {
  const changes: FieldChange[] = [];

  if (oldInteraction.type !== newData.type) {
    changes.push({
      field: "type",
      oldValue: oldInteraction.type,
      newValue: newData.type,
    });
  }

  if (oldInteraction.summary !== newData.summary) {
    changes.push({
      field: "summary",
      oldValue: oldInteraction.summary,
      newValue: newData.summary,
    });
  }

  if (oldInteraction.occurredAt !== newData.occurredAt) {
    changes.push({
      field: "occurredAt",
      oldValue: oldInteraction.occurredAt,
      newValue: newData.occurredAt,
    });
  }

  return changes;
};
