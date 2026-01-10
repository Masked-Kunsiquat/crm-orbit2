import { useCallback, useMemo, useState } from "react";
import * as Contacts from "expo-contacts";

import type { ContactMethodLabel, ContactType } from "@domains/contact";
import { formatPhoneNumber, parsePhoneNumber } from "@domains/contact.utils";
import { nextId } from "@domains/shared/idGenerator";
import { createLogger } from "@utils/logger";
import { useContactActions } from "./useContactActions";
import { useDeviceId } from "./useDeviceId";
import {
  createContactMethod,
  getContactImportDisplayName,
  mapDeviceContactToDraft,
  type ContactImportDraft,
  type DeviceContact,
} from "../utils/contactImport";

export type ContactImportStep = "select" | "map" | "review";

export type ContactImportPickError =
  | "unavailable"
  | "permissionDenied"
  | "duplicate"
  | "loadFailed";

export type ContactImportSaveError =
  | "missingDraft"
  | "nameRequired"
  | "dispatchFailed";

export type PickContactResult =
  | { ok: true }
  | { ok: false; error: ContactImportPickError | "cancelled" };

export type SaveContactResult =
  | { ok: true; contactId: string }
  | {
      ok: false;
      error: ContactImportSaveError;
      message?: string;
    };

export type ImportedContactSummary = {
  id: string;
  name: string;
};

type UseContactImportResult = {
  step: ContactImportStep;
  selectedContacts: ContactImportDraft[];
  currentIndex: number;
  currentDraft: ContactImportDraft | null;
  importedContacts: ImportedContactSummary[];
  isPicking: boolean;
  pickContact: () => Promise<PickContactResult>;
  startMapping: () => void;
  backToSelection: () => void;
  resetImport: () => void;
  removeSelectedContact: (sourceId: string) => void;
  updateFirstName: (value: string) => void;
  updateLastName: (value: string) => void;
  updateTitle: (value: string) => void;
  updateType: (value: ContactType) => void;
  addEmail: () => void;
  updateEmail: (index: number, value: string) => void;
  updateEmailLabel: (index: number, label: ContactMethodLabel) => void;
  removeEmail: (index: number) => void;
  addPhone: () => void;
  updatePhone: (index: number, value: string) => void;
  updatePhoneExtension: (index: number, value: string) => void;
  updatePhoneLabel: (index: number, label: ContactMethodLabel) => void;
  removePhone: (index: number) => void;
  skipCurrent: () => void;
  saveCurrent: () => SaveContactResult;
};

const logger = createLogger("ContactImport");

export const useContactImport = (): UseContactImportResult => {
  const deviceId = useDeviceId();
  const { createContact } = useContactActions(deviceId);
  const [step, setStep] = useState<ContactImportStep>("select");
  const [selectedContacts, setSelectedContacts] = useState<
    ContactImportDraft[]
  >([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [importedContacts, setImportedContacts] = useState<
    ImportedContactSummary[]
  >([]);
  const [isPicking, setIsPicking] = useState(false);

  const currentDraft = useMemo(
    () => selectedContacts[currentIndex] ?? null,
    [currentIndex, selectedContacts],
  );

  const resetImport = useCallback(() => {
    setStep("select");
    setSelectedContacts([]);
    setCurrentIndex(0);
    setImportedContacts([]);
  }, []);

  const startMapping = useCallback(() => {
    if (selectedContacts.length === 0) return;
    setCurrentIndex(0);
    setStep("map");
  }, [selectedContacts.length]);

  const backToSelection = useCallback(() => {
    setStep("select");
  }, []);

  const removeSelectedContact = useCallback(
    (sourceId: string) => {
      const indexToRemove = selectedContacts.findIndex(
        (contact) => contact.sourceId === sourceId,
      );
      if (indexToRemove === -1) {
        return;
      }
      const next = selectedContacts.filter(
        (contact) => contact.sourceId !== sourceId,
      );
      setSelectedContacts(next);
      setCurrentIndex((current) => {
        if (next.length === 0) return 0;
        if (indexToRemove < current) return current - 1;
        if (indexToRemove === current && current >= next.length) {
          return Math.max(0, next.length - 1);
        }
        return current;
      });
    },
    [selectedContacts],
  );

  const updateCurrentDraft = useCallback(
    (updater: (draft: ContactImportDraft) => ContactImportDraft) => {
      setSelectedContacts((prev) =>
        prev.map((draft, index) =>
          index === currentIndex ? updater(draft) : draft,
        ),
      );
    },
    [currentIndex],
  );

  const updateFirstName = useCallback(
    (value: string) =>
      updateCurrentDraft((draft) => ({ ...draft, firstName: value })),
    [updateCurrentDraft],
  );

  const updateLastName = useCallback(
    (value: string) =>
      updateCurrentDraft((draft) => ({ ...draft, lastName: value })),
    [updateCurrentDraft],
  );

  const updateTitle = useCallback(
    (value: string) =>
      updateCurrentDraft((draft) => ({ ...draft, title: value })),
    [updateCurrentDraft],
  );

  const updateType = useCallback(
    (value: ContactType) =>
      updateCurrentDraft((draft) => ({ ...draft, type: value })),
    [updateCurrentDraft],
  );

  const addEmail = useCallback(
    () =>
      updateCurrentDraft((draft) => ({
        ...draft,
        emails: [
          ...draft.emails,
          createContactMethod("", "contact.method.label.work"),
        ],
      })),
    [updateCurrentDraft],
  );

  const updateEmail = useCallback(
    (index: number, value: string) =>
      updateCurrentDraft((draft) => {
        const emails = [...draft.emails];
        emails[index] = { ...emails[index], value };
        return { ...draft, emails };
      }),
    [updateCurrentDraft],
  );

  const updateEmailLabel = useCallback(
    (index: number, label: ContactMethodLabel) =>
      updateCurrentDraft((draft) => {
        const emails = [...draft.emails];
        emails[index] = { ...emails[index], label };
        return { ...draft, emails };
      }),
    [updateCurrentDraft],
  );

  const removeEmail = useCallback(
    (index: number) =>
      updateCurrentDraft((draft) => ({
        ...draft,
        emails: draft.emails.filter((_, i) => i !== index),
      })),
    [updateCurrentDraft],
  );

  const addPhone = useCallback(
    () =>
      updateCurrentDraft((draft) => ({
        ...draft,
        phones: [
          ...draft.phones,
          createContactMethod("", "contact.method.label.work", ""),
        ],
      })),
    [updateCurrentDraft],
  );

  const updatePhone = useCallback(
    (index: number, value: string) =>
      updateCurrentDraft((draft) => {
        const parsed = parsePhoneNumber(value);
        const phones = [...draft.phones];
        const existingExtension = phones[index]?.extension ?? "";
        const nextExtension =
          parsed.extension !== undefined ? parsed.extension : existingExtension;
        phones[index] = {
          ...phones[index],
          value: formatPhoneNumber(parsed.base),
          extension: nextExtension,
        };
        return { ...draft, phones };
      }),
    [updateCurrentDraft],
  );

  const updatePhoneExtension = useCallback(
    (index: number, value: string) =>
      updateCurrentDraft((draft) => {
        const phones = [...draft.phones];
        phones[index] = {
          ...phones[index],
          extension: value.replace(/\D/g, ""),
        };
        return { ...draft, phones };
      }),
    [updateCurrentDraft],
  );

  const updatePhoneLabel = useCallback(
    (index: number, label: ContactMethodLabel) =>
      updateCurrentDraft((draft) => {
        const phones = [...draft.phones];
        phones[index] = { ...phones[index], label };
        return { ...draft, phones };
      }),
    [updateCurrentDraft],
  );

  const removePhone = useCallback(
    (index: number) =>
      updateCurrentDraft((draft) => ({
        ...draft,
        phones: draft.phones.filter((_, i) => i !== index),
      })),
    [updateCurrentDraft],
  );

  const skipCurrent = useCallback(() => {
    if (currentIndex >= selectedContacts.length - 1) {
      setStep("review");
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, selectedContacts.length]);

  const saveCurrent = useCallback((): SaveContactResult => {
    if (!currentDraft) {
      return { ok: false, error: "missingDraft" };
    }
    const hasName =
      currentDraft.firstName.trim() || currentDraft.lastName.trim();
    if (!hasName) {
      return { ok: false, error: "nameRequired" };
    }

    const validEmails = currentDraft.emails.filter(
      (email) => email.value.trim() !== "",
    );
    const validPhones = currentDraft.phones
      .map((phone) => ({
        ...phone,
        extension: phone.extension?.trim() || undefined,
      }))
      .filter((phone) => phone.value.trim() !== "");

    const contactId = nextId("contact");
    const result = createContact(
      currentDraft.firstName.trim(),
      currentDraft.lastName.trim(),
      currentDraft.type,
      currentDraft.title.trim() || undefined,
      {
        emails: validEmails,
        phones: validPhones,
      },
      contactId,
    );

    if (!result.success) {
      return {
        ok: false,
        error: "dispatchFailed",
        message: result.error,
      };
    }

    setImportedContacts((prev) => [
      ...prev,
      {
        id: contactId,
        name: getContactImportDisplayName(currentDraft),
      },
    ]);

    if (currentIndex >= selectedContacts.length - 1) {
      setStep("review");
    } else {
      setCurrentIndex((prev) => prev + 1);
    }

    return { ok: true, contactId };
  }, [createContact, currentDraft, currentIndex, selectedContacts.length]);

  const pickContact = useCallback(async (): Promise<PickContactResult> => {
    if (isPicking) return { ok: false, error: "loadFailed" };
    setIsPicking(true);
    try {
      const available = await Contacts.isAvailableAsync();
      if (!available) {
        return { ok: false, error: "unavailable" };
      }
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        return { ok: false, error: "permissionDenied" };
      }

      const picked = await Contacts.presentContactPickerAsync();
      if (!picked) {
        return { ok: false, error: "cancelled" };
      }

      const detailed =
        (await Contacts.getContactByIdAsync(picked.id)) ?? picked;
      if (!detailed) {
        return { ok: false, error: "loadFailed" };
      }

      if (
        selectedContacts.some((contact) => contact.sourceId === detailed.id)
      ) {
        return { ok: false, error: "duplicate" };
      }

      const draft = mapDeviceContactToDraft(detailed as DeviceContact);
      setSelectedContacts((prev) => [...prev, draft]);
      return { ok: true };
    } catch (error) {
      logger.error("Failed to pick contact", error);
      return { ok: false, error: "loadFailed" };
    } finally {
      setIsPicking(false);
    }
  }, [isPicking, selectedContacts]);

  return {
    step,
    selectedContacts,
    currentIndex,
    currentDraft,
    importedContacts,
    isPicking,
    pickContact,
    startMapping,
    backToSelection,
    resetImport,
    removeSelectedContact,
    updateFirstName,
    updateLastName,
    updateTitle,
    updateType,
    addEmail,
    updateEmail,
    updateEmailLabel,
    removeEmail,
    addPhone,
    updatePhone,
    updatePhoneExtension,
    updatePhoneLabel,
    removePhone,
    skipCurrent,
    saveCurrent,
  };
};
