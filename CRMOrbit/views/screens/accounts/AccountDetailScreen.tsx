import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
  Linking,
} from "react-native";
import { useState, useMemo } from "react";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

import type { AccountsStackScreenProps } from "../../navigation/types";
import {
  useAccount,
  useOrganization,
  useContacts,
  useNotes,
} from "../../store/store";
import { useAccountActions } from "../../hooks/useAccountActions";
import { getContactDisplayName } from "@domains/contact.utils";
import type { ContactType } from "@domains/contact";
import { Tooltip, NotesSection } from "../../components";
import { t } from "@i18n/index";
import { useTheme } from "../../hooks/useTheme";

const DEVICE_ID = "device-local";

type Props = AccountsStackScreenProps<"AccountDetail">;

export const AccountDetailScreen = ({ route, navigation }: Props) => {
  const { accountId } = route.params;
  const account = useAccount(accountId);
  const organization = useOrganization(account?.organizationId ?? "");
  const allContacts = useContacts(accountId);
  const notes = useNotes("account", accountId);
  const { deleteAccount } = useAccountActions(DEVICE_ID);
  const { colors } = useTheme();

  const [contactFilter, setContactFilter] = useState<"all" | ContactType>(
    "all",
  );

  const contacts = useMemo(() => {
    if (contactFilter === "all") {
      return allContacts;
    }
    return allContacts.filter((contact) => contact.type === contactFilter);
  }, [allContacts, contactFilter]);

  if (!account) {
    return (
      <View style={[styles.container, { backgroundColor: colors.canvas }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          {t("accounts.notFound")}
        </Text>
      </View>
    );
  }

  const handleEdit = () => {
    navigation.navigate("AccountForm", { accountId: account.id });
  };

  const handleDelete = () => {
    if (allContacts.length > 0) {
      Alert.alert(
        t("accounts.cannotDeleteTitle"),
        t("accounts.cannotDeleteMessage")
          .replace("{name}", account.name)
          .replace("{count}", allContacts.length.toString()),
        [{ text: t("common.ok") }],
      );
      return;
    }

    Alert.alert(
      t("accounts.deleteTitle"),
      t("accounts.deleteConfirmation").replace("{name}", account.name),
      [
        {
          text: t("common.cancel"),
          style: "cancel",
        },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            const result = deleteAccount(account.id);
            if (result.success) {
              navigation.goBack();
            } else {
              Alert.alert(
                t("common.error"),
                result.error ?? t("accounts.deleteError"),
              );
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.canvas }]}>
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {account.name}
          </Text>
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: colors.accent }]}
            onPress={handleEdit}
          >
            <Text style={[styles.editButtonText, { color: colors.surface }]}>
              {t("common.edit")}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {t("accounts.fields.organization")}
          </Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>
            {organization?.name ?? t("common.unknown")}
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {t("accounts.fields.status")}
          </Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  account.status === "account.status.active"
                    ? colors.statusActiveBg
                    : colors.statusInactiveBg,
              },
            ]}
          >
            <Text style={styles.statusText}>
              {account.status === "account.status.active"
                ? t("status.active")
                : t("status.inactive")}
            </Text>
          </View>
        </View>

        {account.addresses?.site && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t("accounts.fields.siteAddress")}
            </Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>
              {account.addresses.site.street}
            </Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>
              {account.addresses.site.city}, {account.addresses.site.state}{" "}
              {account.addresses.site.zipCode}
            </Text>
          </View>
        )}

        {account.addresses?.parking && !account.addresses.useSameForParking && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t("accounts.fields.parkingAddress")}
            </Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>
              {account.addresses.parking.street}
            </Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>
              {account.addresses.parking.city},{" "}
              {account.addresses.parking.state}{" "}
              {account.addresses.parking.zipCode}
            </Text>
          </View>
        )}

        {account.addresses?.useSameForParking && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t("accounts.fields.parkingAddress")}
            </Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>
              {t("accounts.sameAsSiteAddress")}
            </Text>
          </View>
        )}

        {account.website && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t("accounts.fields.website")}
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL(account.website!)}>
              <Text style={[styles.link, { color: colors.link }]}>
                {account.website}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {account.socialMedia &&
          Object.values(account.socialMedia).some((v) => v) && (
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t("accounts.fields.socialMedia")}
              </Text>
              {account.socialMedia.facebook && (
                <Tooltip content={account.socialMedia.facebook}>
                  <Pressable
                    onPress={() =>
                      Linking.openURL(account.socialMedia!.facebook!)
                    }
                    style={styles.socialLinkContainer}
                  >
                    <Text style={[styles.socialLink, { color: colors.link }]}>
                      {t("accounts.socialMedia.facebook")}
                    </Text>
                    <FontAwesome6
                      name="square-facebook"
                      size={18}
                      color={colors.accent}
                      style={styles.socialIcon}
                    />
                  </Pressable>
                </Tooltip>
              )}
              {account.socialMedia.instagram && (
                <Tooltip
                  content={
                    account.socialMedia.instagram.startsWith("http")
                      ? account.socialMedia.instagram
                      : `https://instagram.com/${account.socialMedia.instagram}`
                  }
                >
                  <Pressable
                    onPress={() => {
                      const url = account.socialMedia!.instagram!.startsWith(
                        "http",
                      )
                        ? account.socialMedia!.instagram!
                        : `https://instagram.com/${account.socialMedia!.instagram}`;
                      Linking.openURL(url);
                    }}
                    style={styles.socialLinkContainer}
                  >
                    <Text style={[styles.socialLink, { color: colors.link }]}>
                      {t("accounts.socialMedia.instagram")}
                    </Text>
                    <FontAwesome6
                      name="instagram"
                      size={18}
                      color={colors.accent}
                      style={styles.socialIcon}
                    />
                  </Pressable>
                </Tooltip>
              )}
              {account.socialMedia.linkedin && (
                <Tooltip content={account.socialMedia.linkedin}>
                  <Pressable
                    onPress={() =>
                      Linking.openURL(account.socialMedia!.linkedin!)
                    }
                    style={styles.socialLinkContainer}
                  >
                    <Text style={[styles.socialLink, { color: colors.link }]}>
                      {t("accounts.socialMedia.linkedin")}
                    </Text>
                    <FontAwesome6
                      name="linkedin"
                      size={18}
                      color={colors.accent}
                      style={styles.socialIcon}
                    />
                  </Pressable>
                </Tooltip>
              )}
              {account.socialMedia.x && (
                <Tooltip
                  content={
                    account.socialMedia.x.startsWith("http")
                      ? account.socialMedia.x
                      : `https://x.com/${account.socialMedia.x}`
                  }
                >
                  <Pressable
                    onPress={() => {
                      const url = account.socialMedia!.x!.startsWith("http")
                        ? account.socialMedia!.x!
                        : `https://x.com/${account.socialMedia!.x}`;
                      Linking.openURL(url);
                    }}
                    style={styles.socialLinkContainer}
                  >
                    <Text style={[styles.socialLink, { color: colors.link }]}>
                      {t("accounts.socialMedia.x")}
                    </Text>
                    <FontAwesome6
                      name="square-x-twitter"
                      size={18}
                      color={colors.accent}
                      style={styles.socialIcon}
                    />
                  </Pressable>
                </Tooltip>
              )}
            </View>
          )}
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t("accounts.sections.contacts")} ({allContacts.length})
        </Text>

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
            onPress={() => setContactFilter("all")}
          >
            <Text
              style={[
                styles.filterButtonText,
                {
                  color:
                    contactFilter === "all"
                      ? colors.surface
                      : colors.textSecondary,
                },
              ]}
            >
              {t("accounts.filters.all")} ({allContacts.length})
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
            onPress={() => setContactFilter("contact.type.internal")}
          >
            <Text
              style={[
                styles.filterButtonText,
                {
                  color:
                    contactFilter === "contact.type.internal"
                      ? colors.surface
                      : colors.textSecondary,
                },
              ]}
            >
              {t("contact.type.internal")} (
              {
                allContacts.filter((c) => c.type === "contact.type.internal")
                  .length
              }
              )
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
            onPress={() => setContactFilter("contact.type.external")}
          >
            <Text
              style={[
                styles.filterButtonText,
                {
                  color:
                    contactFilter === "contact.type.external"
                      ? colors.surface
                      : colors.textSecondary,
                },
              ]}
            >
              {t("contact.type.external")} (
              {
                allContacts.filter((c) => c.type === "contact.type.external")
                  .length
              }
              )
            </Text>
          </TouchableOpacity>
        </View>

        {contacts.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {contactFilter === "all"
              ? t("accounts.noContacts")
              : t("accounts.noContactsFiltered").replace(
                  "{type}",
                  t(contactFilter as string),
                )}
          </Text>
        ) : (
          contacts.map((contact) => (
            <Pressable
              key={contact.id}
              style={[
                styles.contactCard,
                { backgroundColor: colors.surfaceElevated },
              ]}
              onPress={() => {
                // Navigate to contact detail using root navigator
                navigation.navigate("ContactDetail", { contactId: contact.id });
              }}
            >
              <View style={styles.contactCardContent}>
                <Text style={[styles.contactName, { color: colors.textPrimary }]}>
                  {getContactDisplayName(contact)}
                </Text>
                {contact.title && (
                  <Text
                    style={[styles.contactTitle, { color: colors.textSecondary }]}
                  >
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
          ))
        )}
      </View>

      <NotesSection
        notes={notes}
        entityId={accountId}
        entityType="account"
        navigation={navigation}
      />

      <TouchableOpacity
        style={[styles.deleteButton, { backgroundColor: colors.error }]}
        onPress={handleDelete}
      >
        <Text style={[styles.deleteButtonText, { color: colors.surface }]}>
          {t("accounts.deleteButton")}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    flex: 1,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  value: {
    fontSize: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  filterButtons: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 80,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
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
  chevron: {
    fontSize: 20,
    marginLeft: 8,
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
  emptyText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  link: {
    fontSize: 16,
    textDecorationLine: "underline",
  },
  socialLinkContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 8,
  },
  socialLink: {
    fontSize: 16,
  },
  socialIcon: {
    marginLeft: 4,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 32,
  },
  deleteButton: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
