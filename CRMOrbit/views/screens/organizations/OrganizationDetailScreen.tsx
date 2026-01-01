import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Linking,
  Pressable,
} from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

import type { OrganizationsStackScreenProps } from "@views/navigation/types";
import {
  useOrganization,
  useAccountsByOrganization,
  useContactsByOrganization,
  useNotes,
} from "@views/store/store";
import { useOrganizationActions } from "@views/hooks/useOrganizationActions";
import { getContactDisplayName } from "@domains/contact.utils";
import { Tooltip, NotesSection } from "@views/components";
import { t } from "@i18n/index";

const DEVICE_ID = "device-local";

type Props = OrganizationsStackScreenProps<"OrganizationDetail">;

export const OrganizationDetailScreen = ({ route, navigation }: Props) => {
  const { organizationId } = route.params;
  const organization = useOrganization(organizationId);
  const accounts = useAccountsByOrganization(organizationId);
  const contacts = useContactsByOrganization(organizationId);
  const notes = useNotes("organization", organizationId);
  const { deleteOrganization } = useOrganizationActions(DEVICE_ID);

  if (!organization) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>{t("organizations.notFound")}</Text>
      </View>
    );
  }

  const handleEdit = () => {
    navigation.navigate("OrganizationForm", { organizationId });
  };

  const handleDelete = () => {
    if (accounts.length > 0) {
      Alert.alert(
        t("organizations.cannotDeleteTitle"),
        t("organizations.cannotDeleteMessage")
          .replace("{name}", organization.name)
          .replace("{count}", accounts.length.toString()),
        [{ text: t("common.ok") }],
      );
      return;
    }

    Alert.alert(
      t("organizations.deleteTitle"),
      t("organizations.deleteConfirmation").replace("{name}", organization.name),
      [
        {
          text: t("common.cancel"),
          style: "cancel",
        },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            const result = deleteOrganization(organization.id);
            if (result.success) {
              navigation.goBack();
            } else {
              Alert.alert(
                t("common.error"),
                result.error ?? t("organizations.deleteError"),
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
        {organization.logoUri && (
          <View style={styles.logoContainer}>
            <Image source={{ uri: organization.logoUri }} style={styles.logo} />
          </View>
        )}
        <Text style={styles.label}>{t("organizations.fields.name")}</Text>
        <Text style={styles.value}>{organization.name}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>{t("organizations.fields.status")}</Text>
        <View
          style={[
            styles.statusBadge,
            organization.status === "organization.status.active"
              ? styles.statusActive
              : styles.statusInactive,
          ]}
        >
          <Text style={styles.statusText}>
            {organization.status === "organization.status.active"
              ? t("status.active")
              : t("status.inactive")}
          </Text>
        </View>
      </View>

      {organization.website && (
        <View style={styles.section}>
          <Text style={styles.label}>{t("organizations.fields.website")}</Text>
          <TouchableOpacity
            onPress={() => Linking.openURL(organization.website!)}
          >
            <Text style={styles.link}>{organization.website}</Text>
          </TouchableOpacity>
        </View>
      )}

      {organization.socialMedia &&
        Object.values(organization.socialMedia).some((v) => v) && (
          <View style={styles.section}>
            <Text style={styles.label}>{t("organizations.fields.socialMedia")}</Text>
            {organization.socialMedia.facebook && (
              <Tooltip content={organization.socialMedia.facebook}>
                <Pressable
                  onPress={() =>
                    Linking.openURL(organization.socialMedia!.facebook!)
                  }
                  style={styles.socialLinkContainer}
                >
                  <Text style={styles.socialLink}>{t("organizations.socialMedia.facebook")}</Text>
                  <FontAwesome6
                    name="square-facebook"
                    size={18}
                    color="#1f5eff"
                    style={styles.socialIcon}
                  />
                </Pressable>
              </Tooltip>
            )}
            {organization.socialMedia.instagram && (
              <Tooltip
                content={
                  organization.socialMedia.instagram.startsWith("http")
                    ? organization.socialMedia.instagram
                    : `https://instagram.com/${organization.socialMedia.instagram}`
                }
              >
                <Pressable
                  onPress={() =>
                    Linking.openURL(
                      organization.socialMedia!.instagram!.startsWith("http")
                        ? organization.socialMedia!.instagram!
                        : `https://instagram.com/${organization.socialMedia!.instagram}`,
                    )
                  }
                  style={styles.socialLinkContainer}
                >
                  <Text style={styles.socialLink}>{t("organizations.socialMedia.instagram")}</Text>
                  <FontAwesome6
                    name="instagram"
                    size={18}
                    color="#1f5eff"
                    style={styles.socialIcon}
                  />
                </Pressable>
              </Tooltip>
            )}
            {organization.socialMedia.linkedin && (
              <Tooltip content={organization.socialMedia.linkedin}>
                <Pressable
                  onPress={() =>
                    Linking.openURL(organization.socialMedia!.linkedin!)
                  }
                  style={styles.socialLinkContainer}
                >
                  <Text style={styles.socialLink}>{t("organizations.socialMedia.linkedin")}</Text>
                  <FontAwesome6
                    name="linkedin"
                    size={18}
                    color="#1f5eff"
                    style={styles.socialIcon}
                  />
                </Pressable>
              </Tooltip>
            )}
            {organization.socialMedia.x && (
              <Tooltip
                content={
                  organization.socialMedia.x.startsWith("http")
                    ? organization.socialMedia.x
                    : `https://x.com/${organization.socialMedia.x}`
                }
              >
                <Pressable
                  onPress={() =>
                    Linking.openURL(
                      organization.socialMedia!.x!.startsWith("http")
                        ? organization.socialMedia!.x!
                        : `https://x.com/${organization.socialMedia!.x}`,
                    )
                  }
                  style={styles.socialLinkContainer}
                >
                  <Text style={styles.socialLink}>{t("organizations.socialMedia.x")}</Text>
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

      <View style={styles.section}>
        <Text style={styles.label}>{t("organizations.fields.created")}</Text>
        <Text style={styles.value}>
          {new Date(organization.createdAt).toLocaleString()}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t("organizations.sections.accounts")} ({accounts.length})
        </Text>
        {accounts.length === 0 ? (
          <Text style={styles.emptyText}>{t("organizations.noAccounts")}</Text>
        ) : (
          accounts.map((account) => (
            <View key={account.id} style={styles.relatedItem}>
              <View
                style={[
                  styles.statusIndicator,
                  account.status === "account.status.active"
                    ? styles.statusIndicatorActive
                    : styles.statusIndicatorInactive,
                ]}
              />
              <Text style={styles.relatedName}>{account.name}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t("organizations.sections.contacts")} ({contacts.length})
        </Text>
        {contacts.length === 0 ? (
          <Text style={styles.emptyText}>
            {t("organizations.noContacts")}
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
        entityId={organizationId}
        entityType="organization"
        navigation={navigation}
      />

      <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
        <Text style={styles.editButtonText}>{t("organizations.editButton")}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteButtonText}>{t("organizations.deleteButton")}</Text>
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
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 8,
  },
  label: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  value: {
    fontSize: 16,
    color: "#1b1b1b",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 8,
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
  relatedItem: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    flexDirection: "row",
    alignItems: "center",
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 12,
  },
  statusIndicatorActive: {
    backgroundColor: "#4caf50",
  },
  statusIndicatorInactive: {
    backgroundColor: "#f44336",
  },
  relatedName: {
    fontSize: 15,
    color: "#1b1b1b",
    flex: 1,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
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
  chevron: {
    fontSize: 20,
    color: "#cccccc",
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: "#1f5eff",
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  editButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    fontSize: 16,
    color: "#b00020",
    textAlign: "center",
    marginTop: 40,
  },
  deleteButton: {
    backgroundColor: "#b00020",
    margin: 16,
    marginTop: 0,
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
