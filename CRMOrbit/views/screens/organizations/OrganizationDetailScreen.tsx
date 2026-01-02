import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Linking,
} from "react-native";

import type { OrganizationsStackScreenProps } from "@views/navigation/types";
import {
  useOrganization,
  useAccountsByOrganization,
  useContactsByOrganization,
  useNotes,
} from "@views/store/store";
import { useOrganizationActions } from "@views/hooks/useOrganizationActions";
import { useTheme } from "@views/hooks";
import {
  NotesSection,
  DetailScreenLayout,
  Section,
  DetailField,
  SocialLinksSection,
  ContactCardRow,
} from "@views/components";
import { t } from "@i18n/index";

const DEVICE_ID = "device-local";

type Props = OrganizationsStackScreenProps<"OrganizationDetail">;

export const OrganizationDetailScreen = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const { organizationId } = route.params;
  const organization = useOrganization(organizationId);
  const accounts = useAccountsByOrganization(organizationId);
  const contacts = useContactsByOrganization(organizationId);
  const notes = useNotes("organization", organizationId);
  const { deleteOrganization } = useOrganizationActions(DEVICE_ID);

  if (!organization) {
    return (
      <DetailScreenLayout>
        <Text style={[styles.error, { color: colors.error }]}>
          {t("organizations.notFound")}
        </Text>
      </DetailScreenLayout>
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
      t("organizations.deleteConfirmation").replace(
        "{name}",
        organization.name,
      ),
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
    <DetailScreenLayout>
      <Section>
        {organization.logoUri && (
          <View style={styles.logoContainer}>
            <Image source={{ uri: organization.logoUri }} style={styles.logo} />
          </View>
        )}
        <DetailField label={t("organizations.fields.name")}>
          {organization.name}
        </DetailField>
      </Section>

      <Section>
        <DetailField label={t("organizations.fields.status")}>
          <View
            style={[
              styles.statusBadge,
              organization.status === "organization.status.active"
                ? { backgroundColor: colors.successBg }
                : { backgroundColor: colors.errorBg },
            ]}
          >
            <Text style={[styles.statusText, { color: colors.textPrimary }]}>
              {organization.status === "organization.status.active"
                ? t("status.active")
                : t("status.inactive")}
            </Text>
          </View>
        </DetailField>
      </Section>

      {organization.website && (
        <Section>
          <DetailField label={t("organizations.fields.website")}>
            <TouchableOpacity
              onPress={() => Linking.openURL(organization.website!)}
            >
              <Text style={[styles.link, { color: colors.link }]}>
                {organization.website}
              </Text>
            </TouchableOpacity>
          </DetailField>
        </Section>
      )}

      {organization.socialMedia &&
        Object.values(organization.socialMedia).some((v) => v) && (
          <Section>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t("organizations.fields.socialMedia")}
            </Text>
            <SocialLinksSection
              socialMedia={organization.socialMedia}
              translationPrefix="organizations"
            />
          </Section>
        )}

      <Section>
        <DetailField label={t("organizations.fields.created")}>
          {new Date(organization.createdAt).toLocaleString()}
        </DetailField>
      </Section>

      <Section>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t("organizations.sections.accounts")} ({accounts.length})
        </Text>
        {accounts.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t("organizations.noAccounts")}
          </Text>
        ) : (
          accounts.map((account) => (
            <View
              key={account.id}
              style={[
                styles.relatedItem,
                { borderTopColor: colors.borderLight },
              ]}
            >
              <View
                style={[
                  styles.statusIndicator,
                  account.status === "account.status.active"
                    ? { backgroundColor: colors.success }
                    : { backgroundColor: colors.error },
                ]}
              />
              <Text style={[styles.relatedName, { color: colors.textPrimary }]}>
                {account.name}
              </Text>
            </View>
          ))
        )}
      </Section>

      <Section>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t("organizations.sections.contacts")} ({contacts.length})
        </Text>
        {contacts.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t("organizations.noContacts")}
          </Text>
        ) : (
          contacts.map((contact) => (
            <ContactCardRow
              key={contact.id}
              contact={contact}
              onPress={() =>
                navigation.navigate("ContactDetail", { contactId: contact.id })
              }
            />
          ))
        )}
      </Section>

      <NotesSection
        notes={notes}
        entityId={organizationId}
        entityType="organization"
        navigation={navigation}
      />

      <TouchableOpacity
        style={[styles.editButton, { backgroundColor: colors.link }]}
        onPress={handleEdit}
      >
        <Text style={styles.editButtonText}>
          {t("organizations.editButton")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.deleteButton, { backgroundColor: colors.error }]}
        onPress={handleDelete}
      >
        <Text style={styles.deleteButtonText}>
          {t("organizations.deleteButton")}
        </Text>
      </TouchableOpacity>
    </DetailScreenLayout>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    marginBottom: 4,
    textTransform: "uppercase",
    fontWeight: "600",
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
    textDecorationLine: "underline",
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
  relatedItem: {
    paddingVertical: 8,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 12,
  },
  relatedName: {
    fontSize: 15,
    flex: 1,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  editButton: {
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
    textAlign: "center",
    marginTop: 40,
  },
  deleteButton: {
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
