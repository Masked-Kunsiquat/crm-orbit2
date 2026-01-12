import { StyleSheet, Text, TouchableOpacity } from "react-native";
import type { Contact } from "@domains/contact";
import { useTheme } from "../hooks";
import { Section } from "./Section";
import { ContactCardRow } from "./ContactCardRow";

const PREVIEW_LIMIT = 3;

export interface OrganizationContactsSectionProps {
  contacts: Contact[];
  labels: {
    title: string;
    noContactsLabel: string;
    viewAllLabel: string;
  };
  onContactPress: (contactId: string) => void;
  onViewAllPress: () => void;
}

export const OrganizationContactsSection = ({
  contacts,
  labels,
  onContactPress,
  onViewAllPress,
}: OrganizationContactsSectionProps) => {
  const { colors } = useTheme();

  const previewContacts = contacts.slice(0, PREVIEW_LIMIT);
  const hasMore = contacts.length > PREVIEW_LIMIT;

  return (
    <Section>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        {labels.title} ({contacts.length})
      </Text>
      {contacts.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {labels.noContactsLabel}
        </Text>
      ) : (
        previewContacts.map((contact) => (
          <ContactCardRow
            key={contact.id}
            contact={contact}
            onPress={() => onContactPress(contact.id)}
          />
        ))
      )}
      {hasMore ? (
        <TouchableOpacity
          style={[styles.viewAllButton, { borderColor: colors.border }]}
          onPress={onViewAllPress}
        >
          <Text style={[styles.viewAllText, { color: colors.accent }]}>
            {labels.viewAllLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </Section>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  viewAllButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    marginTop: 12,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
