import { StyleSheet, Text, TouchableOpacity } from "react-native";
import type { Contact } from "@domains/contact";
import { t } from "@i18n/index";
import { useTheme } from "../hooks";
import { Section } from "./Section";
import { ContactCardRow } from "./ContactCardRow";

const PREVIEW_LIMIT = 3;

export interface OrganizationContactsSectionProps {
  contacts: Contact[];
  onContactPress: (contactId: string) => void;
  onViewAllPress: () => void;
}

export const OrganizationContactsSection = ({
  contacts,
  onContactPress,
  onViewAllPress,
}: OrganizationContactsSectionProps) => {
  const { colors } = useTheme();

  const previewContacts = contacts.slice(0, PREVIEW_LIMIT);
  const hasMore = contacts.length > PREVIEW_LIMIT;

  return (
    <Section>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        {t("organizations.sections.contacts")} ({contacts.length})
      </Text>
      {contacts.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {t("organizations.noContacts")}
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
            {t("common.viewAll")}
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
