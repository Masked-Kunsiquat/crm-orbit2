import { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

import { t } from "@i18n/index";
import type { ContactsStackScreenProps } from "@views/navigation/types";
import { useContact } from "@views/store/store";
import { useContactActions } from "@views/hooks/useContactActions";
import { useAccountActions } from "@views/hooks/useAccountActions";
import { useDeviceId } from "@views/hooks";
import type { ContactType, ContactMethod } from "@domains/contact";
import {
  formatPhoneNumber,
  parsePhoneNumber,
  splitLegacyName,
} from "@domains/contact.utils";
import { nextId } from "@domains/shared/idGenerator";
import { useTheme } from "@views/hooks/useTheme";
import {
  FormField,
  FormScreenLayout,
  MethodListEditor,
  SegmentedOptionGroup,
  TextField,
  ConfirmDialog,
} from "@views/components";
import { useConfirmDialog } from "@views/hooks/useConfirmDialog";

type Props = ContactsStackScreenProps<"ContactForm">;

export const ContactFormScreen = ({ route, navigation }: Props) => {
  const { contactId, accountLink } = route.params ?? {};
  const contact = useContact(contactId ?? "");
  const deviceId = useDeviceId();
  const { createContact, updateContact } = useContactActions(deviceId);
  const { linkContact } = useAccountActions(deviceId);
  const { colors } = useTheme();
  const { dialogProps, showAlert } = useConfirmDialog();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ContactType>("contact.type.internal");
  const [emails, setEmails] = useState<ContactMethod[]>([]);
  const [phones, setPhones] = useState<ContactMethod[]>([]);
  const lastContactIdRef = useRef<string | undefined>(undefined);

  const emailLabelOptions = [
    {
      value: "contact.method.label.work",
      label: t("contact.method.label.work"),
    },
    {
      value: "contact.method.label.personal",
      label: t("contact.method.label.personal"),
    },
    {
      value: "contact.method.label.other",
      label: t("contact.method.label.other"),
    },
  ] as const;
  const phoneLabelOptions = [
    {
      value: "contact.method.label.work",
      label: t("contact.method.label.work"),
    },
    {
      value: "contact.method.label.personal",
      label: t("contact.method.label.personal"),
    },
    {
      value: "contact.method.label.mobile",
      label: t("contact.method.label.mobile"),
    },
    {
      value: "contact.method.label.other",
      label: t("contact.method.label.other"),
    },
  ] as const;

  // Only populate form fields on initial mount or when switching to a different contact
  useEffect(() => {
    const ensureMethodIds = (methods: ContactMethod[]) =>
      methods.map((method) => ({
        ...method,
        id: method.id || nextId("contact-method"),
        extension: method.extension ?? "",
      }));
    const formatPhoneMethods = (methods: ContactMethod[]) =>
      ensureMethodIds(methods).map((method) => {
        const parsed = parsePhoneNumber(method.value);
        const extension =
          method.extension?.trim() || parsed.extension || "";
        return {
          ...method,
          value: formatPhoneNumber(parsed.base),
          extension,
        };
      });

    const currentContactId = contactId ?? undefined;
    const isContactChanged = currentContactId !== lastContactIdRef.current;

    if (isContactChanged) {
      lastContactIdRef.current = currentContactId;

      if (contact) {
        // Handle legacy name field migration
        if (contact.firstName || contact.lastName) {
          setFirstName(contact.firstName || "");
          setLastName(contact.lastName || "");
        } else if (contact.name) {
          // Migrate legacy name
          const { firstName: fName, lastName: lName } = splitLegacyName(
            contact.name,
          );
          setFirstName(fName || "");
          setLastName(lName || "");
        }
        setTitle(contact.title || "");
        setType(contact.type);
        setEmails(ensureMethodIds(contact.methods.emails));
        setPhones(formatPhoneMethods(contact.methods.phones));
      } else {
        // New contact - reset to defaults
        setFirstName("");
        setLastName("");
        setTitle("");
        setType("contact.type.internal");
        setEmails([]);
        setPhones([]);
      }
    }
  }, [contactId, contact]);

  const handleFirstNameChange = (value: string) => {
    setFirstName(value);
  };

  const handleLastNameChange = (value: string) => {
    setLastName(value);
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
  };

  const handleTypeChange = (value: ContactType) => {
    setType(value);
  };

  const handleAddEmail = () => {
    setEmails([
      ...emails,
      {
        id: nextId("contact-method"),
        value: "",
        label: "contact.method.label.work",
        status: "contact.method.status.active",
      },
    ]);
  };

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = { ...newEmails[index], value };
    setEmails(newEmails);
  };

  const handleEmailLabelChange = (
    index: number,
    label: ContactMethod["label"],
  ) => {
    const newEmails = [...emails];
    newEmails[index] = { ...newEmails[index], label };
    setEmails(newEmails);
  };

  const handleRemoveEmail = (index: number) => {
    setEmails(emails.filter((_, i) => i !== index));
  };

  const handleAddPhone = () => {
    setPhones([
      ...phones,
      {
        id: nextId("contact-method"),
        value: "",
        extension: "",
        label: "contact.method.label.work",
        status: "contact.method.status.active",
      },
    ]);
  };

  const handlePhoneChange = (index: number, value: string) => {
    const parsed = parsePhoneNumber(value);
    const newPhones = [...phones];
    const nextExtension =
      parsed.extension !== undefined
        ? parsed.extension
        : (newPhones[index]?.extension ?? "");
    newPhones[index] = {
      ...newPhones[index],
      value: formatPhoneNumber(parsed.base),
      extension: nextExtension,
    };
    setPhones(newPhones);
  };

  const handlePhoneExtensionChange = (index: number, value: string) => {
    const newPhones = [...phones];
    newPhones[index] = {
      ...newPhones[index],
      extension: value.replace(/\D/g, ""),
    };
    setPhones(newPhones);
  };

  const handlePhoneLabelChange = (
    index: number,
    label: ContactMethod["label"],
  ) => {
    const newPhones = [...phones];
    newPhones[index] = { ...newPhones[index], label };
    setPhones(newPhones);
  };

  const handleRemovePhone = (index: number) => {
    setPhones(phones.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!firstName.trim() && !lastName.trim()) {
      showAlert(
        t("common.validationError"),
        t("contacts.validation.nameRequired"),
        t("common.ok"),
      );
      return;
    }

    // Filter out empty email/phone values
    const validEmails = emails.filter((e) => e.value.trim() !== "");
    const validPhones = phones
      .map((phone) => ({
        ...phone,
        extension: phone.extension?.trim() || undefined,
      }))
      .filter((p) => p.value.trim() !== "");

    if (contactId) {
      const result = updateContact(
        contactId,
        firstName.trim(),
        lastName.trim(),
        type,
        title.trim() || undefined,
        {
          emails: validEmails,
          phones: validPhones,
        },
        contact ?? undefined,
      );
      if (result.success) {
        navigation.goBack();
      } else {
        showAlert(
          t("common.error"),
          result.error || t("contacts.updateError"),
          t("common.ok"),
        );
      }
    } else {
      const contactIdForLink = accountLink ? nextId("contact") : undefined;
      const result = createContact(
        firstName.trim(),
        lastName.trim(),
        type,
        title.trim() || undefined,
        {
          emails: validEmails,
          phones: validPhones,
        },
        contactIdForLink,
      );
      if (result.success) {
        if (accountLink && contactIdForLink) {
          const linkResult = linkContact(
            accountLink.accountId,
            contactIdForLink,
            accountLink.role,
            Boolean(accountLink.setPrimary),
          );
          if (linkResult.success) {
            navigation.goBack();
          } else {
            showAlert(
              t("common.error"),
              linkResult.error || t("contacts.linkError"),
              t("common.ok"),
              () => navigation.goBack(),
            );
          }
        } else {
          navigation.goBack();
        }
      } else {
        showAlert(
          t("common.error"),
          result.error || t("contacts.createError"),
          t("common.ok"),
        );
      }
    }
  };

  const types: ContactType[] = [
    "contact.type.internal",
    "contact.type.external",
    "contact.type.vendor",
  ];
  const typeOptions = types.map((typeKey) => ({
    value: typeKey,
    label: t(typeKey),
  }));

  return (
    <FormScreenLayout>
      <FormField label={t("contacts.form.firstNameLabel")}>
        <TextField
          value={firstName}
          onChangeText={handleFirstNameChange}
          placeholder={t("contacts.form.firstNamePlaceholder")}
        />
      </FormField>

      <FormField
        label={t("contacts.form.lastNameLabel")}
        hint={t("contacts.form.nameHint")}
      >
        <TextField
          value={lastName}
          onChangeText={handleLastNameChange}
          placeholder={t("contacts.form.lastNamePlaceholder")}
        />
      </FormField>

      <FormField label={t("contacts.form.titleLabel")}>
        <TextField
          value={title}
          onChangeText={handleTitleChange}
          placeholder={t("contacts.form.titlePlaceholder")}
        />
      </FormField>

      <FormField label={t("contacts.form.typeLabel")}>
        <SegmentedOptionGroup
          options={typeOptions}
          value={type}
          onChange={handleTypeChange}
        />
      </FormField>

      <MethodListEditor
        label={t("contacts.form.emailsLabel")}
        methods={emails}
        onAdd={handleAddEmail}
        onChange={handleEmailChange}
        onLabelChange={handleEmailLabelChange}
        onRemove={handleRemoveEmail}
        placeholder={t("contacts.form.emailPlaceholder")}
        addLabel={t("contacts.form.addAction")}
        labelOptions={emailLabelOptions}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <MethodListEditor
        label={t("contacts.form.phonesLabel")}
        methods={phones}
        onAdd={handleAddPhone}
        onChange={handlePhoneChange}
        onSecondaryChange={handlePhoneExtensionChange}
        onLabelChange={handlePhoneLabelChange}
        onRemove={handleRemovePhone}
        placeholder={t("contacts.form.phonePlaceholder")}
        secondaryPlaceholder={t("contacts.form.phoneExtensionPlaceholder")}
        addLabel={t("contacts.form.addAction")}
        labelOptions={phoneLabelOptions}
        keyboardType="phone-pad"
        secondaryKeyboardType="number-pad"
        autoCapitalize="none"
        secondaryAutoCapitalize="none"
      />

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: colors.accent }]}
        onPress={handleSave}
      >
        <Text style={[styles.saveButtonText, { color: colors.onAccent }]}>
          {contactId
            ? t("contacts.form.updateButton")
            : t("contacts.form.createButton")}
        </Text>
      </TouchableOpacity>

      {dialogProps ? <ConfirmDialog {...dialogProps} /> : null}
    </FormScreenLayout>
  );
};

const styles = StyleSheet.create({
  saveButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
