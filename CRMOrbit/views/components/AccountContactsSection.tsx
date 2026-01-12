import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { Contact, ContactType } from "@domains/contact";
import { useTheme } from "../hooks/useTheme";
import { Section } from "./Section";
import { ContactCardRow } from "./ContactCardRow";

const PREVIEW_LIMIT = 3;

export interface AccountContactsSectionProps {
  allContacts: Contact[];
  contactFilter: "all" | ContactType;
  labels: {
    title: string;
    createLabel: string;
    linkLabel: string;
    filterAllLabel: string;
    filterInternalLabel: string;
    filterExternalLabel: string;
    emptyStateText: string;
    viewAllLabel: string;
  };
  onContactFilterChange: (filter: "all" | ContactType) => void;
  onContactPress: (contactId: string) => void;
  onCreatePress: () => void;
  onLinkPress: () => void;
  onViewAllPress: () => void;
}

/**
 * Renders the contacts section for an account with filtering and actions.
 * Extracted from AccountDetailScreen to reduce file size.
 */
export const AccountContactsSection = ({
  allContacts,
  contactFilter,
  labels,
  onContactFilterChange,
  onContactPress,
  onCreatePress,
  onLinkPress,
  onViewAllPress,
}: AccountContactsSectionProps) => {
  const { colors } = useTheme();

  const contacts = useMemo(() => {
    if (contactFilter === "all") {
      return allContacts;
    }
    return allContacts.filter((contact) => contact.type === contactFilter);
  }, [allContacts, contactFilter]);

  const previewContacts = contacts.slice(0, PREVIEW_LIMIT);
  const hasMoreContacts = contacts.length > PREVIEW_LIMIT;

  const internalCount = allContacts.filter(
    (c) => c.type === "contact.type.internal",
  ).length;
  const externalCount = allContacts.filter(
    (c) => c.type === "contact.type.external",
  ).length;

  return (
    <Section>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {labels.title} ({allContacts.length})
        </Text>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.accent }]}
            onPress={onCreatePress}
            accessibilityLabel={labels.createLabel}
          >
            <MaterialCommunityIcons
              name="plus"
              size={18}
              color={colors.onAccent}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.iconButton,
              styles.iconButtonSecondary,
              { backgroundColor: colors.surfaceElevated },
            ]}
            onPress={onLinkPress}
            accessibilityLabel={labels.linkLabel}
          >
            <MaterialCommunityIcons
              name="link-variant-plus"
              size={18}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterButtons}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              borderColor: colors.border,
              backgroundColor:
                contactFilter === "all" ? colors.accent : colors.surface,
            },
          ]}
          onPress={() => onContactFilterChange("all")}
        >
          <Text
            style={[
              styles.filterButtonText,
              {
                color:
                  contactFilter === "all"
                    ? colors.onAccent
                    : colors.textSecondary,
              },
            ]}
          >
            {labels.filterAllLabel} ({allContacts.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              borderColor: colors.border,
              backgroundColor:
                contactFilter === "contact.type.internal"
                  ? colors.accent
                  : colors.surface,
            },
          ]}
          onPress={() => onContactFilterChange("contact.type.internal")}
        >
          <Text
            style={[
              styles.filterButtonText,
              {
                color:
                  contactFilter === "contact.type.internal"
                    ? colors.onAccent
                    : colors.textSecondary,
              },
            ]}
          >
            {labels.filterInternalLabel} ({internalCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              borderColor: colors.border,
              backgroundColor:
                contactFilter === "contact.type.external"
                  ? colors.accent
                  : colors.surface,
            },
          ]}
          onPress={() => onContactFilterChange("contact.type.external")}
        >
          <Text
            style={[
              styles.filterButtonText,
              {
                color:
                  contactFilter === "contact.type.external"
                    ? colors.onAccent
                    : colors.textSecondary,
              },
            ]}
          >
            {labels.filterExternalLabel} ({externalCount})
          </Text>
        </TouchableOpacity>
      </View>

      {contacts.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {labels.emptyStateText}
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
      {hasMoreContacts ? (
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
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonSecondary: {
    marginLeft: 8,
  },
  filterButtons: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    marginVertical: 24,
  },
  viewAllButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
