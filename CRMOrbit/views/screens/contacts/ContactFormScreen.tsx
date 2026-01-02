import { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";

import { t } from "@i18n/index";
import type { ContactsStackScreenProps } from "@views/navigation/types";
import { useContact } from "@views/store/store";
import { useContactActions } from "@views/hooks/useContactActions";
import type { ContactType, ContactMethod } from "@domains/contact";
import { splitLegacyName } from "@domains/contact.utils";
import { useTheme } from "@views/hooks/useTheme";
import { FormField, FormScreenLayout, TextField } from "@views/components";

const DEVICE_ID = "device-local";

type Props = ContactsStackScreenProps<"ContactForm">;

export const ContactFormScreen = ({ route, navigation }: Props) => {
  const { contactId } = route.params ?? {};
  const contact = useContact(contactId ?? "");
  const { createContact, updateContact } = useContactActions(DEVICE_ID);
  const { colors } = useTheme();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ContactType>("contact.type.internal");
  const [emails, setEmails] = useState<ContactMethod[]>([]);
  const [phones, setPhones] = useState<ContactMethod[]>([]);
  const lastContactIdRef = useRef<string | undefined>(undefined);

  // Only populate form fields on initial mount or when switching to a different contact
  useEffect(() => {
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
        setEmails(contact.methods.emails);
        setPhones(contact.methods.phones);
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

  const handleRemoveEmail = (index: number) => {
    setEmails(emails.filter((_, i) => i !== index));
  };

  const handleAddPhone = () => {
    setPhones([
      ...phones,
      {
        value: "",
        label: "contact.method.label.work",
        status: "contact.method.status.active",
      },
    ]);
  };

  const handlePhoneChange = (index: number, value: string) => {
    const newPhones = [...phones];
    newPhones[index] = { ...newPhones[index], value };
    setPhones(newPhones);
  };

  const handleRemovePhone = (index: number) => {
    setPhones(phones.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!firstName.trim() && !lastName.trim()) {
      Alert.alert(
        t("common.validationError"),
        t("contacts.validation.nameRequired"),
      );
      return;
    }

    // Filter out empty email/phone values
    const validEmails = emails.filter((e) => e.value.trim() !== "");
    const validPhones = phones.filter((p) => p.value.trim() !== "");

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
      );
      if (result.success) {
        navigation.goBack();
      } else {
        Alert.alert(
          t("common.error"),
          result.error || t("contacts.updateError"),
        );
      }
    } else {
      const result = createContact(
        firstName.trim(),
        lastName.trim(),
        type,
        title.trim() || undefined,
        {
          emails: validEmails,
          phones: validPhones,
        },
      );
      if (result.success) {
        navigation.goBack();
      } else {
        Alert.alert(
          t("common.error"),
          result.error || t("contacts.createError"),
        );
      }
    }
  };

  const getTypeLabel = (typeKey: ContactType) => {
    return t(typeKey);
  };

  const types: ContactType[] = [
    "contact.type.internal",
    "contact.type.external",
    "contact.type.vendor",
  ];

  return (
    <FormScreenLayout>
      <FormField label={t("contacts.form.firstNameLabel")}>
        <TextField
          value={firstName}
          onChangeText={handleFirstNameChange}
          placeholder={t("contacts.form.firstNamePlaceholder")}
          autoFocus
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
        <View style={styles.typeButtons}>
          {types.map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.typeButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
                type === t && {
                  backgroundColor: colors.accent,
                  borderColor: colors.accent,
                },
              ]}
              onPress={() => handleTypeChange(t)}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  { color: colors.textSecondary },
                  type === t && { color: colors.surface },
                ]}
              >
                {getTypeLabel(t)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </FormField>

      <FormField
        label={t("contacts.form.emailsLabel")}
        accessory={
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.accent }]}
            onPress={handleAddEmail}
          >
            <Text style={[styles.addButtonText, { color: colors.surface }]}>
              {t("contacts.form.addAction")}
            </Text>
          </TouchableOpacity>
        }
      >
        {emails.map((email, index) => (
          <View key={index} style={styles.methodRow}>
            <TextField
              style={styles.methodInput}
              value={email.value}
              onChangeText={(value) => handleEmailChange(index, value)}
              placeholder={t("contacts.form.emailPlaceholder")}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.removeButton, { backgroundColor: colors.errorBg }]}
              onPress={() => handleRemoveEmail(index)}
            >
              <Text style={[styles.removeButtonText, { color: colors.error }]}>
                ×
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </FormField>

      <FormField
        label={t("contacts.form.phonesLabel")}
        accessory={
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.accent }]}
            onPress={handleAddPhone}
          >
            <Text style={[styles.addButtonText, { color: colors.surface }]}>
              {t("contacts.form.addAction")}
            </Text>
          </TouchableOpacity>
        }
      >
        {phones.map((phone, index) => (
          <View key={index} style={styles.methodRow}>
            <TextField
              style={styles.methodInput}
              value={phone.value}
              onChangeText={(value) => handlePhoneChange(index, value)}
              placeholder={t("contacts.form.phonePlaceholder")}
              keyboardType="phone-pad"
            />
            <TouchableOpacity
              style={[styles.removeButton, { backgroundColor: colors.errorBg }]}
              onPress={() => handleRemovePhone(index)}
            >
              <Text style={[styles.removeButtonText, { color: colors.error }]}>
                ×
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </FormField>

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: colors.accent }]}
        onPress={handleSave}
      >
        <Text style={[styles.saveButtonText, { color: colors.surface }]}>
          {contactId
            ? t("contacts.form.updateButton")
            : t("contacts.form.createButton")}
        </Text>
      </TouchableOpacity>
    </FormScreenLayout>
  );
};

const styles = StyleSheet.create({
  typeButtons: {
    flexDirection: "row",
    gap: 8,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  methodRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  methodInput: {
    flex: 1,
  },
  removeButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  removeButtonText: {
    fontSize: 24,
    fontWeight: "300",
  },
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
