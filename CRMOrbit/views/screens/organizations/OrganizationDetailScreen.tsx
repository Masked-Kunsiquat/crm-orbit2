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
} from "@views/store/store";
import { useOrganizationActions } from "@views/hooks/useOrganizationActions";
import { getContactDisplayName } from "@domains/contact.utils";
import { Tooltip } from "@views/components";

const DEVICE_ID = "device-local";

type Props = OrganizationsStackScreenProps<"OrganizationDetail">;

export const OrganizationDetailScreen = ({ route, navigation }: Props) => {
  const { organizationId } = route.params;
  const organization = useOrganization(organizationId);
  const accounts = useAccountsByOrganization(organizationId);
  const contacts = useContactsByOrganization(organizationId);
  const { deleteOrganization } = useOrganizationActions(DEVICE_ID);

  if (!organization) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Organization not found</Text>
      </View>
    );
  }

  const handleEdit = () => {
    navigation.navigate("OrganizationForm", { organizationId });
  };

  const handleDelete = () => {
    if (accounts.length > 0) {
      Alert.alert(
        "Cannot Delete",
        `Cannot delete "${organization.name}" because it has ${accounts.length} associated account(s). Please delete or reassign the accounts first.`,
        [{ text: "OK" }],
      );
      return;
    }

    Alert.alert(
      "Delete Organization",
      `Are you sure you want to delete "${organization.name}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const result = deleteOrganization(organization.id);
            if (result.success) {
              navigation.goBack();
            } else {
              Alert.alert("Error", result.error ?? "Failed to delete organization");
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
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{organization.name}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Status</Text>
        <View
          style={[
            styles.statusBadge,
            organization.status === "organization.status.active"
              ? styles.statusActive
              : styles.statusInactive,
          ]}
        >
          <Text style={styles.statusText}>
            {organization.status === "organization.status.active" ? "Active" : "Inactive"}
          </Text>
        </View>
      </View>

      {organization.website && (
        <View style={styles.section}>
          <Text style={styles.label}>Website</Text>
          <TouchableOpacity onPress={() => Linking.openURL(organization.website!)}>
            <Text style={styles.link}>{organization.website}</Text>
          </TouchableOpacity>
        </View>
      )}

      {organization.socialMedia && Object.values(organization.socialMedia).some((v) => v) && (
        <View style={styles.section}>
          <Text style={styles.label}>Social Media</Text>
          {organization.socialMedia.facebook && (
            <Tooltip content={organization.socialMedia.facebook}>
              <Pressable
                onPress={() => Linking.openURL(organization.socialMedia!.facebook!)}
                style={styles.socialLinkContainer}
              >
                <Text style={styles.socialLink}>Facebook</Text>
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
                <Text style={styles.socialLink}>Instagram</Text>
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
                onPress={() => Linking.openURL(organization.socialMedia!.linkedin!)}
                style={styles.socialLinkContainer}
              >
                <Text style={styles.socialLink}>LinkedIn</Text>
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
                <Text style={styles.socialLink}>X</Text>
                <FontAwesome6 name="square-x-twitter" size={18} color="#1f5eff" style={styles.socialIcon} />
              </Pressable>
            </Tooltip>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.label}>Created</Text>
        <Text style={styles.value}>{new Date(organization.createdAt).toLocaleString()}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accounts ({accounts.length})</Text>
        {accounts.length === 0 ? (
          <Text style={styles.emptyText}>No accounts yet</Text>
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
        <Text style={styles.sectionTitle}>Contacts ({contacts.length})</Text>
        {contacts.length === 0 ? (
          <Text style={styles.emptyText}>No contacts linked to accounts in this organization</Text>
        ) : (
          contacts.map((contact) => (
            <Pressable
              key={contact.id}
              style={styles.contactCard}
              onPress={() => {
                // Navigate to ContactsTab
                (navigation.navigate as any)("ContactsTab", {
                  screen: "ContactDetail",
                  params: { contactId: contact.id },
                });
              }}
            >
              <View style={styles.contactCardContent}>
                <Text style={styles.contactName}>{getContactDisplayName(contact)}</Text>
                {contact.title && <Text style={styles.contactTitle}>{contact.title}</Text>}
                <Text style={styles.contactType}>{contact.type}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))
        )}
      </View>

      <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
        <Text style={styles.editButtonText}>Edit Organization</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteButtonText}>Delete Organization</Text>
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
    marginBottom: 12,
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
