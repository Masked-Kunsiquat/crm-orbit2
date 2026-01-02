import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Contact } from "@domains/contact";
import { getContactDisplayName } from "@domains/contact.utils";
import { useTheme } from "../hooks";
import { t } from "@i18n/index";

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
        <View
          style={[
            styles.contactTypeBadge,
            {
              backgroundColor:
                contact.type === "contact.type.internal"
                  ? colors.contactTypeInternalBg
                  : contact.type === "contact.type.external"
                    ? colors.contactTypeExternalBg
                    : colors.contactTypeVendorBg,
            },
          ]}
        >
          <Text
            style={[
              styles.contactTypeText,
              {
                color:
                  contact.type === "contact.type.internal"
                    ? colors.contactTypeInternalText
                    : contact.type === "contact.type.external"
                      ? colors.contactTypeExternalText
                      : colors.contactTypeVendorText,
              },
            ]}
          >
            {contact.type === "contact.type.internal"
              ? t("contact.type.internal")
              : contact.type === "contact.type.external"
                ? t("contact.type.external")
                : t("contact.type.vendor")}
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
