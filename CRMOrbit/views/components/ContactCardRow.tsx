import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Contact } from "@domains/contact";
import { getContactDisplayName } from "@domains/contact.utils";
import { useTheme } from "../hooks";
import { t } from "@i18n/index";

type ContactCardRowProps = {
  contact: Contact;
  onPress: () => void;
};

const getContactTypeStyling = (
  type: Contact["type"],
  colors: ReturnType<typeof useTheme>["colors"],
  translate: (key: string) => string,
) => {
  switch (type) {
    case "contact.type.internal":
      return {
        backgroundColor: colors.contactTypeInternalBg,
        textColor: colors.contactTypeInternalText,
        label: translate("contact.type.internal"),
      };
    case "contact.type.external":
      return {
        backgroundColor: colors.contactTypeExternalBg,
        textColor: colors.contactTypeExternalText,
        label: translate("contact.type.external"),
      };
    case "contact.type.vendor":
    default:
      return {
        backgroundColor: colors.contactTypeVendorBg,
        textColor: colors.contactTypeVendorText,
        label: translate("contact.type.vendor"),
      };
  }
};

export const ContactCardRow = ({ contact, onPress }: ContactCardRowProps) => {
  const { colors } = useTheme();
  const contactType = getContactTypeStyling(contact.type, colors, t);

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
        <View
          style={[
            styles.contactTypeBadge,
            { backgroundColor: contactType.backgroundColor },
          ]}
        >
          <Text
            style={[styles.contactTypeText, { color: contactType.textColor }]}
          >
            {contactType.label}
          </Text>
        </View>
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  contactTypeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  chevron: {
    fontSize: 20,
    marginLeft: 8,
  },
});
