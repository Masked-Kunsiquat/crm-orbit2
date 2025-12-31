import { StyleSheet, Text } from "react-native";

import { ActionButton, Section } from "@views/components";
import { useAccountActions, useContactActions } from "@views/hooks";
import {
  useAccounts,
  useAllContacts,
  useAccountContactRelations,
} from "@views/store/store";

const DEVICE_ID = "device-local";

export const ContactsScreen = () => {
  const accounts = useAccounts();
  const allContacts = useAllContacts();
  const accountContactRelations = useAccountContactRelations();
  const { createContact } = useContactActions(DEVICE_ID);
  const { linkContact } = useAccountActions(DEVICE_ID);

  const handleAddContact = () => {
    // Use timestamp-based identifier (locale-neutral)
    // In production, this would prompt the user for name and email
    const timestamp = Date.now();
    const firstName = `Contact`;
    const lastName = `${timestamp}`;
    const contactEmail = `${timestamp}@example.local`;

    const result = createContact(
      firstName,
      lastName,
      "contact.type.internal",
      undefined,
      {
        emails: [
          {
            value: contactEmail,
            label: "contact.method.label.work",
            status: "contact.method.status.active",
          },
        ],
        phones: [],
      },
    );

    // Link to first account if available using the returned ID
    if (result.success && accounts.length > 0) {
      const account = accounts[0];

      // Check if account already has a primary contact
      const existingPrimary = Object.values(accountContactRelations).some(
        (relation) =>
          relation.accountId === account.id &&
          relation.role === "account.contact.role.primary" &&
          relation.isPrimary,
      );

      // Use the returned contact ID immediately - no race condition
      linkContact(
        account.id,
        result.id,
        "account.contact.role.primary",
        !existingPrimary,
      );
    }
  };

  return (
    <Section title="Contacts">
      <ActionButton label="Add contact" onPress={handleAddContact} />
      {allContacts.length === 0 ? (
        <Text style={styles.empty}>No contacts yet.</Text>
      ) : (
        allContacts.map((contact) => (
          <Text key={contact.id} style={styles.item}>
            {contact.name} ({contact.type})
          </Text>
        ))
      )}
    </Section>
  );
};

const styles = StyleSheet.create({
  item: {
    fontSize: 14,
    marginBottom: 6,
    color: "#2a2a2a",
  },
  empty: {
    fontSize: 13,
    color: "#7a7a7a",
    fontStyle: "italic",
  },
});
