import { StyleSheet, Text } from "react-native";

import { PrimaryActionButton, Section } from "@views/components";
import { useContactActions, useDeviceId, useTheme } from "@views/hooks";
import { useAccounts, useAllContacts } from "@views/store/store";
import { nextId } from "@domains/shared/idGenerator";
import { t } from "@i18n/index";

export const ContactsScreen = () => {
  const accounts = useAccounts();
  const allContacts = useAllContacts();
  const deviceId = useDeviceId();
  const { createContact } = useContactActions(deviceId);
  const { colors } = useTheme();

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
            id: nextId("contact-method"),
            value: contactEmail,
            label: "contact.method.label.work",
            status: "contact.method.status.active",
          },
        ],
        phones: [],
      },
    );

    // Link to first account if available
    // Note: We can't access the contact ID from the result, so this linking
    // would need to be done differently (e.g., by finding the most recently
    // created contact or by having createContact return the ID)
    // For now, commenting out the auto-linking logic
    if (result.success && accounts.length > 0) {
      // TODO: Implement auto-linking once createContact returns the contact ID
      // const account = accounts[0];
      // const contactId = ???; // Need ID from createContact result
      // linkContact(account.id, contactId, "account.contact.role.primary", true);
    }
  };

  return (
    <Section title="Contacts">
      <PrimaryActionButton label="Add contact" onPress={handleAddContact} />
      {allContacts.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>
          {t("contacts.emptyTitle")}
        </Text>
      ) : (
        allContacts.map((contact) => (
          <Text
            key={contact.id}
            style={[styles.item, { color: colors.textPrimary }]}
          >
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
  },
  empty: {
    fontSize: 13,
    fontStyle: "italic",
  },
});
