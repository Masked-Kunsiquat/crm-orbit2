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

const DEVICE_ID = "device-local";

type Props = AccountsStackScreenProps<"AccountDetail">;

export const AccountDetailScreen = ({ route, navigation }: Props) => {
  const { accountId } = route.params;
  const account = useAccount(accountId);
  const organization = useOrganization(account?.organizationId ?? "");
  const allContacts = useContacts(accountId);
  const notes = useNotes("account", accountId);
  const { deleteAccount } = useAccountActions(DEVICE_ID);

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
      <View style={styles.container}>
        <Text style={styles.errorText}>{t("accounts.notFound")}</Text>
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
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <View style={styles.header}>
          <Text style={styles.title}>{account.name}</Text>
          <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
            <Text style={styles.editButtonText}>{t("common.edit")}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t("accounts.fields.organization")}</Text>
          <Text style={styles.value}>
            {organization?.name ?? t("common.unknown")}
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t("accounts.fields.status")}</Text>
          <View
            style={[
              styles.statusBadge,
              account.status === "account.status.active"
                ? styles.statusActive
                : styles.statusInactive,
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
            <Text style={styles.label}>{t("accounts.fields.siteAddress")}</Text>
            <Text style={styles.value}>{account.addresses.site.street}</Text>
            <Text style={styles.value}>
              {account.addresses.site.city}, {account.addresses.site.state}{" "}
              {account.addresses.site.zipCode}
            </Text>
          </View>
        )}

        {account.addresses?.parking && !account.addresses.useSameForParking && (
          <View style={styles.field}>
            <Text style={styles.label}>
              {t("accounts.fields.parkingAddress")}
            </Text>
            <Text style={styles.value}>{account.addresses.parking.street}</Text>
            <Text style={styles.value}>
              {account.addresses.parking.city},{" "}
              {account.addresses.parking.state}{" "}
              {account.addresses.parking.zipCode}
            </Text>
          </View>
        )}

        {account.addresses?.useSameForParking && (
          <View style={styles.field}>
            <Text style={styles.label}>
              {t("accounts.fields.parkingAddress")}
            </Text>
            <Text style={styles.value}>{t("accounts.sameAsSiteAddress")}</Text>
          </View>
        )}

        {account.website && (
          <View style={styles.field}>
            <Text style={styles.label}>{t("accounts.fields.website")}</Text>
            <TouchableOpacity onPress={() => Linking.openURL(account.website!)}>
              <Text style={styles.link}>{account.website}</Text>
            </TouchableOpacity>
          </View>
        )}

        {account.socialMedia &&
          Object.values(account.socialMedia).some((v) => v) && (
            <View style={styles.field}>
              <Text style={styles.label}>{t("accounts.fields.socialMedia")}</Text>
              {account.socialMedia.facebook && (
                <Tooltip content={account.socialMedia.facebook}>
                  <Pressable
                    onPress={() =>
                      Linking.openURL(account.socialMedia!.facebook!)
                    }
                    style={styles.socialLinkContainer}
                  >
                    <Text style={styles.socialLink}>
                      {t("accounts.socialMedia.facebook")}
                    </Text>
                    <FontAwesome6
                      name="square-facebook"
                      size={18}
                      color="#1f5eff"
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
                    <Text style={styles.socialLink}>
                      {t("accounts.socialMedia.instagram")}
                    </Text>
                    <FontAwesome6
                      name="instagram"
                      size={18}
                      color="#1f5eff"
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
                    <Text style={styles.socialLink}>
                      {t("accounts.socialMedia.linkedin")}
                    </Text>
                    <FontAwesome6
                      name="linkedin"
                      size={18}
                      color="#1f5eff"
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
                    <Text style={styles.socialLink}>
                      {t("accounts.socialMedia.x")}
                    </Text>
                    <FontAwesome6
                      name="square-x-twitter"
                      size={18}
                      color="#1f5eff"
                      style={styles.socialIcon}
                    />
                  </Pressable>
                </Tooltip>
              )}
            </View>
          )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t("accounts.sections.contacts")} ({allContacts.length})
        </Text>

        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              contactFilter === "all" && styles.filterButtonActive,
            ]}
            onPress={() => setContactFilter("all")}
          >
            <Text
              style={[
                styles.filterButtonText,
                contactFilter === "all" && styles.filterButtonTextActive,
              ]}
            >
              {t("accounts.filters.all")} ({allContacts.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              contactFilter === "contact.type.internal" &&
                styles.filterButtonActive,
            ]}
            onPress={() => setContactFilter("contact.type.internal")}
          >
            <Text
              style={[
                styles.filterButtonText,
                contactFilter === "contact.type.internal" &&
                  styles.filterButtonTextActive,
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
              contactFilter === "contact.type.external" &&
                styles.filterButtonActive,
            ]}
            onPress={() => setContactFilter("contact.type.external")}
          >
            <Text
              style={[
                styles.filterButtonText,
                contactFilter === "contact.type.external" &&
                  styles.filterButtonTextActive,
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
          <Text style={styles.emptyText}>
            {contactFilter === "all"
              ? t("accounts.noContacts")
              : t("accounts.noContactsFiltered").replace(
                  "{type}",
                  t(contactFilter as any),
                )}
          </Text>
        ) : (
          contacts.map((contact) => (
            <Pressable
              key={contact.id}
              style={styles.contactCard}
              onPress={() => {
                // Navigate to contact detail using root navigator
                navigation.navigate("ContactDetail", { contactId: contact.id });
              }}
            >
              <View style={styles.contactCardContent}>
                <Text style={styles.contactName}>
                  {getContactDisplayName(contact)}
                </Text>
                {contact.title && (
                  <Text style={styles.contactTitle}>{contact.title}</Text>
                )}
                <View
                  style={[
                    styles.contactTypeBadge,
                    contact.type === "contact.type.internal" &&
                      styles.contactTypeInternal,
                    contact.type === "contact.type.external" &&
                      styles.contactTypeExternal,
                    contact.type === "contact.type.vendor" &&
                      styles.contactTypeVendor,
                  ]}
                >
                  <Text style={styles.contactTypeText}>
                    {contact.type === "contact.type.internal"
                      ? t("contact.type.internal")
                      : contact.type === "contact.type.external"
                        ? t("contact.type.external")
                        : t("contact.type.vendor")}
                  </Text>
                </View>
              </View>
              <Text style={styles.chevron}>›</Text>
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

      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteButtonText}>{t("accounts.deleteButton")}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f2ee",
  },
  section: {
    backgroundColor: "#fff",
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
    color: "#1b1b1b",
    flex: 1,
  },
  editButton: {
    backgroundColor: "#1f5eff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  value: {
    fontSize: 16,
    color: "#1b1b1b",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  statusActive: {
    backgroundColor: "#e8f5e9",
  },
  statusInactive: {
    backgroundColor: "#ffebee",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1b1b1b",
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
    borderColor: "#ddd",
    backgroundColor: "#fff",
    alignItems: "center",
    minWidth: 80,
  },
  filterButtonActive: {
    backgroundColor: "#1f5eff",
    borderColor: "#1f5eff",
  },
  filterButtonText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  filterButtonTextActive: {
    color: "#fff",
  },
  contactCard: {
    padding: 12,
    backgroundColor: "#f9f9f9",
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
    color: "#cccccc",
    marginLeft: 8,
  },
  contactName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1b1b1b",
    marginBottom: 2,
  },
  contactTitle: {
    fontSize: 12,
    color: "#666666",
    fontStyle: "italic",
    marginBottom: 4,
  },
  contactType: {
    fontSize: 12,
    color: "#666",
  },
  contactTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  contactTypeInternal: {
    backgroundColor: "#e3f2fd",
  },
  contactTypeExternal: {
    backgroundColor: "#fff3e0",
  },
  contactTypeVendor: {
    backgroundColor: "#f3e5f5",
  },
  contactTypeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1b1b1b",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },
  metadataText: {
    fontSize: 12,
    fontFamily: "monospace",
    color: "#666",
  },
  link: {
    fontSize: 16,
    color: "#1f5eff",
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
    color: "#1f5eff",
  },
  socialIcon: {
    marginLeft: 4,
  },
  errorText: {
    fontSize: 16,
    color: "#b00020",
    textAlign: "center",
    marginTop: 32,
  },
  deleteButton: {
    backgroundColor: "#b00020",
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
