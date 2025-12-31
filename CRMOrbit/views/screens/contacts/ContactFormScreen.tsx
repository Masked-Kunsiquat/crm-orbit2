import { useState, useEffect, useRef } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";

import type { ContactsStackScreenProps } from "@views/navigation/types";
import { useContact } from "@views/store/store";
import { useContactActions } from "@views/hooks/useContactActions";
import type { ContactType, ContactMethod } from "@domains/contact";

const DEVICE_ID = "device-local";

type Props = ContactsStackScreenProps<"ContactForm">;

export const ContactFormScreen = ({ route, navigation }: Props) => {
  const { contactId } = route.params ?? {};
  const contact = useContact(contactId ?? "");
  const { createContact, updateContact } = useContactActions(DEVICE_ID);

  const [name, setName] = useState("");
  const [type, setType] = useState<ContactType>("contact.type.internal");
  const [emails, setEmails] = useState<ContactMethod[]>([]);
  const [phones, setPhones] = useState<ContactMethod[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const lastContactIdRef = useRef<string | undefined>(undefined);

  // Only populate form fields on initial mount or when switching to a different contact
  useEffect(() => {
    const currentContactId = contactId ?? undefined;
    const isContactChanged = currentContactId !== lastContactIdRef.current;

    if (isContactChanged) {
      // Reset dirty flag when switching contacts
      setIsDirty(false);
      lastContactIdRef.current = currentContactId;

      if (contact) {
        setName(contact.name);
        setType(contact.type);
        setEmails(contact.methods.emails);
        setPhones(contact.methods.phones);
      } else {
        // New contact - reset to defaults
        setName("");
        setType("contact.type.internal");
        setEmails([]);
        setPhones([]);
      }
    }
  }, [contactId, contact]);

  const handleNameChange = (value: string) => {
    setName(value);
    setIsDirty(true);
  };

  const handleTypeChange = (value: ContactType) => {
    setType(value);
    setIsDirty(true);
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
    setIsDirty(true);
  };

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = { ...newEmails[index], value };
    setEmails(newEmails);
    setIsDirty(true);
  };

  const handleRemoveEmail = (index: number) => {
    setEmails(emails.filter((_, i) => i !== index));
    setIsDirty(true);
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
    setIsDirty(true);
  };

  const handlePhoneChange = (index: number, value: string) => {
    const newPhones = [...phones];
    newPhones[index] = { ...newPhones[index], value };
    setPhones(newPhones);
    setIsDirty(true);
  };

  const handleRemovePhone = (index: number) => {
    setPhones(phones.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Contact name is required");
      return;
    }

    // Filter out empty email/phone values
    const validEmails = emails.filter((e) => e.value.trim() !== "");
    const validPhones = phones.filter((p) => p.value.trim() !== "");

    if (contactId) {
      const result = updateContact(contactId, name.trim(), type, {
        emails: validEmails,
        phones: validPhones,
      });
      if (result.success) {
        navigation.goBack();
      } else {
        Alert.alert("Error", result.error || "Failed to update contact");
      }
    } else {
      const result = createContact(name.trim(), type, {
        emails: validEmails,
        phones: validPhones,
      });
      if (result.success) {
        navigation.goBack();
      } else {
        Alert.alert("Error", result.error || "Failed to create contact");
      }
    }
  };

  const getTypeLabel = (t: ContactType) => {
    switch (t) {
      case "contact.type.internal":
        return "Internal";
      case "contact.type.external":
        return "External";
      case "contact.type.vendor":
        return "Vendor";
      default:
        return t;
    }
  };

  const types: ContactType[] = [
    "contact.type.internal",
    "contact.type.external",
    "contact.type.vendor",
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={handleNameChange}
            placeholder="Enter contact name"
            autoFocus
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Type</Text>
          <View style={styles.typeButtons}>
            {types.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeButton, type === t && styles.typeButtonActive]}
                onPress={() => handleTypeChange(t)}
              >
                <Text style={[styles.typeButtonText, type === t && styles.typeButtonTextActive]}>
                  {getTypeLabel(t)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <View style={styles.fieldHeader}>
            <Text style={styles.label}>Email Addresses</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddEmail}>
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>
          {emails.map((email, index) => (
            <View key={index} style={styles.methodRow}>
              <TextInput
                style={[styles.input, styles.methodInput]}
                value={email.value}
                onChangeText={(value) => handleEmailChange(index, value)}
                placeholder="email@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveEmail(index)}
              >
                <Text style={styles.removeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.field}>
          <View style={styles.fieldHeader}>
            <Text style={styles.label}>Phone Numbers</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddPhone}>
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>
          {phones.map((phone, index) => (
            <View key={index} style={styles.methodRow}>
              <TextInput
                style={[styles.input, styles.methodInput]}
                value={phone.value}
                onChangeText={(value) => handlePhoneChange(index, value)}
                placeholder="+1 (555) 123-4567"
                keyboardType="phone-pad"
              />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemovePhone(index)}
              >
                <Text style={styles.removeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>
            {contactId ? "Update Contact" : "Create Contact"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f2ee",
  },
  form: {
    padding: 16,
  },
  field: {
    marginBottom: 20,
  },
  fieldHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1b1b1b",
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  typeButtons: {
    flexDirection: "row",
    gap: 8,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  typeButtonActive: {
    backgroundColor: "#1f5eff",
    borderColor: "#1f5eff",
  },
  typeButtonText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  typeButtonTextActive: {
    color: "#fff",
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#1f5eff",
  },
  addButtonText: {
    fontSize: 14,
    color: "#fff",
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
    backgroundColor: "#ffebee",
    alignItems: "center",
    justifyContent: "center",
  },
  removeButtonText: {
    fontSize: 24,
    color: "#b00020",
    fontWeight: "300",
  },
  saveButton: {
    backgroundColor: "#1f5eff",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
