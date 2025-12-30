import { StyleSheet, Text } from "react-native";

import { ActionButton, Section } from "../components";
import { useAccountActions, useContactActions } from "../crm-core/hooks";
import { useAccounts, useContacts } from "../crm-core/views/store";
import { useCrmStore } from "../crm-core/views/store";

const DEVICE_ID = "device-local";

export const ContactsScreen = () => {
  const accounts = useAccounts();
  const doc = useCrmStore((state) => state.doc);
  const allContacts = Object.values(doc.contacts);
  const { createContact } = useContactActions(DEVICE_ID);
  const { linkContact } = useAccountActions(DEVICE_ID);

  const handleAddContact = () => {
    const contactName = `Contact ${allContacts.length + 1}`;
    const contactEmail = `contact${allContacts.length + 1}@example.com`;

    const result = createContact(contactName, "contact.type.internal", {
      emails: [
        {
          value: contactEmail,
          label: "contact.method.label.work",
          status: "contact.method.status.active",
        },
      ],
      phones: [],
    });

    // Link to first account if available
    if (result.success && accounts.length > 0) {
      const account = accounts[0];

      // Check if account already has a primary contact
      const existingPrimary = Object.values(doc.relations.accountContacts).some(
        (relation) =>
          relation.accountId === account.id &&
          relation.role === "account.contact.role.primary" &&
          relation.isPrimary,
      );

      // Wait a moment for the contact to be created, then link
      setTimeout(() => {
        const contacts = Object.values(useCrmStore.getState().doc.contacts);
        const newContact = contacts[contacts.length - 1];
        if (newContact) {
          linkContact(
            account.id,
            newContact.id,
            "account.contact.role.primary",
            !existingPrimary,
          );
        }
      }, 50);
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
