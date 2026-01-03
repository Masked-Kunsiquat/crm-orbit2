import React from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import type { Contact } from "@domains/contact";
import { getContactDisplayName } from "@domains/contact.utils";
import { t } from "@i18n/index";
import { useTheme } from "../hooks";
import { ContactTypeBadge } from "./ContactTypeBadge";
import {
  openPhoneDialer,
  openSMS,
  openEmailComposer,
} from "@domains/linking.utils";

type ContactCardRowProps = {
  contact: Contact;
  onPress: () => void;
};

export const ContactCardRow = ({ contact, onPress }: ContactCardRowProps) => {
  const { colors } = useTheme();

  const primaryPhone = contact.methods.phones[0];
  const primaryEmail = contact.methods.emails[0];

  const handleLinkingError = (error: unknown) => {
    const message = error instanceof Error ? error.message : t("common.error");
    Alert.alert(t("common.error"), message, t("common.ok"));
  };

  const handlePhoneCall = (e: React.BaseSyntheticEvent) => {
    e.stopPropagation();
    if (primaryPhone) {
      void openPhoneDialer(primaryPhone.value).catch(handleLinkingError);
    }
  };

  const handleSMS = (e: React.BaseSyntheticEvent) => {
    e.stopPropagation();
    if (primaryPhone) {
      void openSMS(primaryPhone.value).catch(handleLinkingError);
    }
  };

  const handleEmail = (e: React.BaseSyntheticEvent) => {
    e.stopPropagation();
    if (primaryEmail) {
      void openEmailComposer(primaryEmail.value);
    }
  };

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

      <View style={styles.actionsContainer}>
        {primaryPhone && (
          <>
            <TouchableOpacity
              onPress={handlePhoneCall}
              style={styles.actionButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="call-outline" size={18} color={colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSMS}
              style={styles.actionButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons
                name="message-text-outline"
                size={18}
                color={colors.accent}
              />
            </TouchableOpacity>
          </>
        )}
        {primaryEmail && (
          <TouchableOpacity
            onPress={handleEmail}
            style={styles.actionButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="mail-outline" size={18} color={colors.accent} />
          </TouchableOpacity>
        )}
      </View>
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
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 8,
  },
  actionButton: {
    padding: 4,
  },
});
