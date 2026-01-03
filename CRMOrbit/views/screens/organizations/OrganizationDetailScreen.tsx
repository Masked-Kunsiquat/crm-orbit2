import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";

import type { OrganizationsStackScreenProps } from "@views/navigation/types";
import {
  useOrganization,
  useAccountsByOrganization,
  useContactsByOrganization,
  useInteractions,
  useNotes,
  useTimeline,
  useDoc,
} from "@views/store/store";
import { useOrganizationActions } from "@views/hooks/useOrganizationActions";
import { useDeviceId, useTheme } from "@views/hooks";
import { getOrganizationLogoUrl } from "@domains/organization.utils";
import {
  NotesSection,
  InteractionsSection,
  TimelineSection,
  DetailScreenLayout,
  Section,
  DetailField,
  DetailTabs,
  SocialLinksSection,
  ContactCardRow,
  PrimaryActionButton,
  DangerActionButton,
  ConfirmDialog,
  StatusBadge,
} from "@views/components";
import { t } from "@i18n/index";
import { useConfirmDialog } from "@views/hooks/useConfirmDialog";
import { openWebUrl } from "@domains/linking.utils";

type Props = OrganizationsStackScreenProps<"OrganizationDetail">;
type OrganizationTab = "overview" | "details" | "notes" | "activity";

export const OrganizationDetailScreen = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const { organizationId } = route.params;
  const organization = useOrganization(organizationId);
  const accounts = useAccountsByOrganization(organizationId);
  const contacts = useContactsByOrganization(organizationId);
  const notes = useNotes("organization", organizationId);
  const interactions = useInteractions("organization", organizationId);
  const timeline = useTimeline("organization", organizationId);
  const doc = useDoc();
  const deviceId = useDeviceId();
  const { deleteOrganization } = useOrganizationActions(deviceId);
  const { dialogProps, showDialog, showAlert } = useConfirmDialog();
  const [activeTab, setActiveTab] = useState<OrganizationTab>("overview");

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
      showAlert(
        t("organizations.cannotDeleteTitle"),
        t("organizations.cannotDeleteMessage")
          .replace("{name}", organization.name)
          .replace("{count}", accounts.length.toString()),
        t("common.ok"),
      );
      return;
    }

    showDialog({
      title: t("organizations.deleteTitle"),
      message: t("organizations.deleteConfirmation").replace(
        "{name}",
        organization.name,
      ),
      confirmLabel: t("common.delete"),
      confirmVariant: "danger",
      cancelLabel: t("common.cancel"),
      onConfirm: () => {
        const result = deleteOrganization(organization.id);
        if (result.success) {
          navigation.goBack();
        } else {
          showAlert(
            t("common.error"),
            result.error ?? t("organizations.deleteError"),
            t("common.ok"),
          );
        }
      },
    });
  };

  const logoUrl = getOrganizationLogoUrl(organization, 128);

  return (
    <DetailScreenLayout>
      <Section>
        {logoUrl ? (
          <View style={styles.logoContainer}>
            <Image
              source={{ uri: logoUrl }}
              style={styles.logo}
              contentFit="contain"
              transition={200}
            />
          </View>
        ) : null}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {organization.name}
            </Text>
            <View style={styles.statusRow}>
              <StatusBadge
                isActive={organization.status === "organization.status.active"}
                activeLabelKey="status.active"
                inactiveLabelKey="status.inactive"
              />
            </View>
          </View>
          <PrimaryActionButton
            label={t("common.edit")}
            onPress={handleEdit}
            size="compact"
          />
        </View>
      </Section>

      <DetailTabs
        tabs={[
          { value: "overview", label: t("tabs.overview") },
          { value: "details", label: t("tabs.details") },
          { value: "notes", label: t("tabs.notes") },
          { value: "activity", label: t("tabs.activity") },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === "overview" ? (
        <>
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
                    navigation.navigate("ContactDetail", {
                      contactId: contact.id,
                    })
                  }
                />
              ))
            )}
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
                  <Text
                    style={[styles.relatedName, { color: colors.textPrimary }]}
                  >
                    {account.name}
                  </Text>
                </View>
              ))
            )}
          </Section>
        </>
      ) : null}

      {activeTab === "details" ? (
        <>
          {organization.website ? (
            <Section>
              <DetailField label={t("organizations.fields.website")}>
                <TouchableOpacity
                  onPress={() => void openWebUrl(organization.website!)}
                >
                  <Text style={[styles.link, { color: colors.link }]}>
                    {organization.website}
                  </Text>
                </TouchableOpacity>
              </DetailField>
            </Section>
          ) : null}

          {organization.socialMedia &&
          Object.values(organization.socialMedia).some((v) => v) ? (
            <Section>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t("organizations.fields.socialMedia")}
              </Text>
              <SocialLinksSection
                socialMedia={organization.socialMedia}
                translationPrefix="organizations"
              />
            </Section>
          ) : null}
        </>
      ) : null}

      {activeTab === "notes" ? (
        <>
          <NotesSection
            notes={notes}
            entityId={organizationId}
            entityType="organization"
            navigation={navigation}
          />
          <InteractionsSection
            interactions={interactions}
            entityId={organizationId}
            entityType="organization"
            navigation={navigation}
          />
        </>
      ) : null}

      {activeTab === "activity" ? (
        <TimelineSection timeline={timeline} doc={doc} />
      ) : null}

      <DangerActionButton
        label={t("organizations.deleteButton")}
        onPress={handleDelete}
        size="block"
      />

      {dialogProps ? <ConfirmDialog {...dialogProps} /> : null}
    </DetailScreenLayout>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 6,
  },
  statusRow: {
    alignSelf: "flex-start",
  },
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
  error: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
  },
});
