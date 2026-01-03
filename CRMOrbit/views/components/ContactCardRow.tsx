import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Contact } from "@domains/contact";
import { getContactDisplayName } from "@domains/contact.utils";
import { useTheme } from "../hooks";
import { ContactTypeBadge } from "./ContactTypeBadge";

type ContactCardRowProps = {
  contact: Contact;
  onPress: () => void;
};

export const ContactCardRow = ({ contact, onPress }: ContactCardRowProps) => {
  const { colors } = useTheme();

  return (
    <Pressable
      style={[styles.contactCard, { backgroundColor: colors.surfaceElevated }]}
      onPress={onPress}
    >
      <View style={styles.contactCardContent}>
        <Text style={[styles.contactName, { color: colors.textPrimary }]}>
          {getContactDisplayName(contact)}
        </Text>
        {contact.title && (
          <Text style={[styles.contactTitle, { color: colors.textSecondary }]}>
            {contact.title}
          </Text>
        )}
        <ContactTypeBadge type={contact.type} style={styles.contactTypeBadge} />
      </View>
      <Text style={[styles.chevron, { color: colors.chevron }]}>›</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  contactCard: {
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  contactCardContent: {
    flex: 1,
  },
  contactName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  contactTitle: {
    fontSize: 12,
    fontStyle: "italic",
    marginBottom: 4,
  },
  contactTypeBadge: {
    alignSelf: "flex-start",
    marginTop: 4,
  },
  chevron: {
    fontSize: 20,
    marginLeft: 8,
  },
});
