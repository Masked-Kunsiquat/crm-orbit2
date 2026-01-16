import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useState } from "react";

import type { AccountsStackScreenProps } from "../../navigation/types";
import {
  useAccount,
  useContacts,
  useAllContacts,
  useCodes,
  useNotes,
  useInteractions,
  useAuditsByAccount,
  useTimeline,
  useDoc,
  useAccountContactRelations,
} from "../../store/store";
import { useAccountActions } from "../../hooks/useAccountActions";
import { useDeviceId, useAccountContactManagement } from "../../hooks";
import { getContactDisplayName } from "@domains/contact.utils";
import type { AccountContactRole } from "@domains/relations/accountContact";
import type { ContactType } from "@domains/contact";
import {
  NotesSection,
  InteractionsSection,
  AuditsSection,
  CodesSection,
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
  SegmentedOptionGroup,
  AccountContactsSection,
  AccountAddressFields,
} from "../../components";
import { t } from "@i18n/index";
import { useTheme } from "../../hooks/useTheme";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import { openWebUrl } from "@domains/linking.utils";

type Props = AccountsStackScreenProps<"AccountDetail">;
type AccountTab = "overview" | "details" | "notes" | "activity";

export const AccountDetailScreen = ({ route, navigation }: Props) => {
  const { accountId } = route.params;
  const account = useAccount(accountId);
  const allContacts = useContacts(accountId);
  const allContactsInCrm = useAllContacts();
  const accountContactRelations = useAccountContactRelations();
  const codes = useCodes(accountId);
  const notes = useNotes("account", accountId);
  const interactions = useInteractions("account", accountId);
  const audits = useAuditsByAccount(accountId);
  const timeline = useTimeline("account", accountId);
  const doc = useDoc();
  const deviceId = useDeviceId();
  const { deleteAccount, linkContact } = useAccountActions(deviceId);
  const { colors } = useTheme();

  const { dialogProps, showDialog, showAlert } = useConfirmDialog();
  const pendingEffectiveAt = account?.auditFrequencyPendingEffectiveAt
    ? Date.parse(account.auditFrequencyPendingEffectiveAt)
    : Number.NaN;
  const hasPendingFrequency =
    account?.auditFrequencyPending && !Number.isNaN(pendingEffectiveAt);
  const pendingFrequency =
    hasPendingFrequency && Date.now() < pendingEffectiveAt
      ? account.auditFrequencyPending
      : null;
  const activeFrequency =
    hasPendingFrequency && Date.now() >= pendingEffectiveAt
      ? account.auditFrequencyPending
      : account?.auditFrequency;

  const [activeTab, setActiveTab] = useState<AccountTab>("overview");

  const contactManagement = useAccountContactManagement({
    accountId,
    accountContactRelations,
    allContactsInCrm,
  });

  const roleOptions: Array<{ value: AccountContactRole; label: string }> = [
    {
      value: "account.contact.role.primary",
      label: t("account.contact.role.primary"),
    },
    {
      value: "account.contact.role.billing",
      label: t("account.contact.role.billing"),
    },
    {
      value: "account.contact.role.technical",
      label: t("account.contact.role.technical"),
    },
  ];
  const contactFilterLabels: Record<"all" | ContactType, string> = {
    all: t("accounts.filters.all"),
    "contact.type.internal": t("contact.type.internal"),
    "contact.type.external": t("contact.type.external"),
    "contact.type.vendor": t("contact.type.vendor"),
  };
  const accountContactsLabels = {
    title: t("accounts.sections.contacts"),
    createLabel: t("contacts.form.createButton"),
    linkLabel: t("contacts.linkTitle"),
    filterAllLabel: contactFilterLabels.all,
    filterInternalLabel: contactFilterLabels["contact.type.internal"],
    filterExternalLabel: contactFilterLabels["contact.type.external"],
    emptyStateText:
      contactManagement.contactFilter === "all"
        ? t("accounts.noContacts")
        : t("accounts.noContactsFiltered", {
            type: contactFilterLabels[contactManagement.contactFilter],
          }),
    viewAllLabel: t("common.viewAll"),
  };
  const addressLabels = {
    siteAddress: t("accounts.fields.siteAddress"),
    parkingAddress: t("accounts.fields.parkingAddress"),
    sameAsSiteAddress: t("accounts.sameAsSiteAddress"),
  };

  if (!account) {
    return (
      <DetailScreenLayout>
        <Text style={[styles.errorText, { color: colors.error }]}>
          {t("accounts.notFound")}
        </Text>
      </DetailScreenLayout>
    );
  }

  const handleEdit = () => {
    navigation.navigate("AccountForm", { accountId: account.id });
  };

  const handleDelete = () => {
    if (allContacts.length > 0) {
      showAlert(
        t("accounts.cannotDeleteTitle"),
        t("accounts.cannotDeleteMessage")
          .replace("{name}", account.name)
          .replace("{count}", allContacts.length.toString()),
        t("common.ok"),
      );
      return;
    }

    showDialog({
      title: t("accounts.deleteTitle"),
      message: t("accounts.deleteConfirmation").replace("{name}", account.name),
      confirmLabel: t("common.delete"),
      confirmVariant: "danger",
      cancelLabel: t("common.cancel"),
      onConfirm: () => {
        const result = deleteAccount(account.id);
        if (result.success) {
          navigation.goBack();
        } else {
          showAlert(
            t("common.error"),
            result.error ?? t("accounts.deleteError"),
            t("common.ok"),
          );
        }
      },
    });
  };

  const handleLinkContact = (contactId: string, role: AccountContactRole) => {
    const existingLink = Object.values(accountContactRelations).find(
      (relation) =>
        relation.accountId === accountId &&
        relation.contactId === contactId &&
        relation.role === role,
    );

    if (existingLink) {
      showAlert(
        t("contacts.linkedAccounts.alreadyLinkedTitle"),
        t("contacts.linkedAccounts.alreadyLinkedMessage"),
        t("common.ok"),
      );
      return;
    }

    const hasPrimary = contactManagement.hasPrimaryForRole(role);

    const result = linkContact(accountId, contactId, role, !hasPrimary);

    if (result.success) {
      contactManagement.setShowLinkModal(false);
    } else {
      showAlert(
        t("common.error"),
        result.error ?? t("contacts.linkError"),
        t("common.ok"),
      );
    }
  };

  return (
    <DetailScreenLayout>
      <Section>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {account.name}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {account.status === "account.status.active"
                ? t("status.active")
                : t("status.inactive")}
            </Text>
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
        <AccountContactsSection
          allContacts={allContacts}
          labels={accountContactsLabels}
          contactFilter={contactManagement.contactFilter}
          onContactFilterChange={contactManagement.setContactFilter}
          onContactPress={(contactId) =>
            navigation.navigate("ContactDetail", { contactId })
          }
          onCreatePress={contactManagement.handleOpenCreateModal}
          onLinkPress={() => contactManagement.setShowLinkModal(true)}
          onViewAllPress={() => contactManagement.setShowContactsModal(true)}
        />
      ) : null}

      {activeTab === "details" ? (
        <Section>
          <DetailField label={t("accounts.fields.auditFrequency")}>
            <View>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                {activeFrequency
                  ? t(activeFrequency)
                  : t(account.auditFrequency)}
              </Text>
              {pendingFrequency ? (
                <Text
                  style={[
                    styles.detailSubvalue,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t("accounts.auditFrequencyChange.nextPeriod")}:{" "}
                  {t(pendingFrequency)}
                </Text>
              ) : null}
            </View>
          </DetailField>

          {account.website && (
            <DetailField label={t("accounts.fields.website")}>
              <TouchableOpacity
                onPress={() => void openWebUrl(account.website!)}
              >
                <Text style={[styles.link, { color: colors.link }]}>
                  {account.website}
                </Text>
              </TouchableOpacity>
            </DetailField>
          )}

          <AccountAddressFields account={account} labels={addressLabels} />

          {account.socialMedia &&
            Object.values(account.socialMedia).some((v) => v) && (
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {t("accounts.fields.socialMedia")}
                </Text>
                <SocialLinksSection
                  socialMedia={account.socialMedia}
                  translationPrefix="accounts"
                />
              </View>
            )}
        </Section>
      ) : null}

      {activeTab === "notes" ? (
        <>
          <CodesSection
            codes={codes}
            accountId={accountId}
            navigation={navigation}
          />
          <AuditsSection
            audits={audits}
            account={account}
            accountId={accountId}
            navigation={navigation}
          />
          <InteractionsSection
            interactions={interactions}
            entityId={accountId}
            entityType="account"
            navigation={navigation}
          />
          <NotesSection
            notes={notes}
            entityId={accountId}
            entityType="account"
            navigation={navigation}
          />
        </>
      ) : null}

      {activeTab === "activity" ? (
        <TimelineSection timeline={timeline} doc={doc} />
      ) : null}

      <DangerActionButton
        label={t("accounts.deleteButton")}
        onPress={handleDelete}
        size="block"
      />

      <Modal
        visible={contactManagement.showContactsModal}
        animationType="slide"
        transparent
        onRequestClose={() => contactManagement.setShowContactsModal(false)}
      >
        <View
          style={[
            styles.modalOverlay,
            { backgroundColor: colors.overlayScrim },
          ]}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {t("accounts.sections.contacts")} ({allContacts.length})
              </Text>
              <TouchableOpacity
                onPress={() => contactManagement.setShowContactsModal(false)}
                accessibilityLabel={t("common.cancel")}
              >
                <Text style={[styles.modalClose, { color: colors.accent }]}>
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={allContacts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ContactCardRow
                  contact={item}
                  onPress={() => {
                    contactManagement.setShowContactsModal(false);
                    navigation.navigate("ContactDetail", {
                      contactId: item.id,
                    });
                  }}
                />
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={contactManagement.showLinkModal}
        transparent
        animationType="fade"
        onRequestClose={() => contactManagement.setShowLinkModal(false)}
      >
        <View
          style={[
            styles.modalOverlay,
            { backgroundColor: colors.overlayScrim },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => contactManagement.setShowLinkModal(false)}
          />
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {t("contacts.linkTitle")}
            </Text>
            {contactManagement.sortedLinkableContacts.length === 0 ? (
              <Text
                style={[styles.modalEmptyText, { color: colors.textMuted }]}
              >
                {t("contacts.linkEmpty")}
              </Text>
            ) : (
              <>
                <View style={styles.roleSection}>
                  <Text
                    style={[styles.roleLabel, { color: colors.textSecondary }]}
                  >
                    {t("accountContacts.roleLabel")}
                  </Text>
                  <SegmentedOptionGroup
                    options={roleOptions}
                    value={contactManagement.linkRole}
                    onChange={contactManagement.setLinkRole}
                  />
                </View>
                <FlatList
                  data={contactManagement.sortedLinkableContacts}
                  keyExtractor={(item) => item.id}
                  style={styles.modalList}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.modalItem,
                        { borderBottomColor: colors.borderLight },
                      ]}
                      onPress={() =>
                        handleLinkContact(item.id, contactManagement.linkRole)
                      }
                    >
                      <Text
                        style={[
                          styles.modalItemText,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {getContactDisplayName(item)}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </>
            )}
            <TouchableOpacity
              style={[styles.modalCancelButton, { borderColor: colors.border }]}
              onPress={() => contactManagement.setShowLinkModal(false)}
            >
              <Text
                style={[styles.modalCancelText, { color: colors.textPrimary }]}
              >
                {t("common.cancel")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={contactManagement.showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => contactManagement.setShowCreateModal(false)}
      >
        <View
          style={[
            styles.modalOverlay,
            { backgroundColor: colors.overlayScrim },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => contactManagement.setShowCreateModal(false)}
          />
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {t("contacts.form.createButton")}
            </Text>
            <View style={styles.roleSection}>
              <Text style={[styles.roleLabel, { color: colors.textSecondary }]}>
                {t("accountContacts.roleLabel")}
              </Text>
              <SegmentedOptionGroup
                options={roleOptions}
                value={contactManagement.createRole}
                onChange={(nextRole) => {
                  contactManagement.setCreateRole(nextRole);
                  contactManagement.setCreatePrimary(
                    !contactManagement.hasPrimaryForRole(nextRole),
                  );
                }}
              />
            </View>
            {contactManagement.hasPrimaryForRole(
              contactManagement.createRole,
            ) ? (
              <Text style={[styles.roleHint, { color: colors.textMuted }]}>
                {t("accountContacts.primaryAlreadySet")}
              </Text>
            ) : (
              <View style={styles.roleSection}>
                <Text
                  style={[styles.roleLabel, { color: colors.textSecondary }]}
                >
                  {t("accountContacts.primaryLabel")}
                </Text>
                <SegmentedOptionGroup
                  options={[
                    {
                      value: "yes",
                      label: t("accountContacts.primaryOption"),
                    },
                    {
                      value: "no",
                      label: t("accountContacts.notPrimaryOption"),
                    },
                  ]}
                  value={contactManagement.createPrimary ? "yes" : "no"}
                  onChange={(value) =>
                    contactManagement.setCreatePrimary(value === "yes")
                  }
                />
              </View>
            )}
            <TouchableOpacity
              style={[
                styles.modalActionButton,
                { backgroundColor: colors.accent },
              ]}
              onPress={() => {
                contactManagement.setShowCreateModal(false);
                navigation.navigate({
                  name: "ContactForm",
                  params: {
                    accountLink: {
                      accountId,
                      role: contactManagement.createRole,
                      setPrimary: contactManagement.createPrimary,
                    },
                  },
                });
              }}
            >
              <Text
                style={[styles.modalActionText, { color: colors.onAccent }]}
              >
                {t("contacts.form.createButton")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalCancelButton, { borderColor: colors.border }]}
              onPress={() => contactManagement.setShowCreateModal(false)}
            >
              <Text
                style={[styles.modalCancelText, { color: colors.textPrimary }]}
              >
                {t("common.cancel")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {dialogProps ? <ConfirmDialog {...dialogProps} /> : null}
    </DetailScreenLayout>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
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
  detailValue: {
    fontSize: 16,
  },
  detailSubvalue: {
    fontSize: 13,
    marginTop: 2,
  },
  link: {
    fontSize: 16,
    textDecorationLine: "underline",
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 32,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalClose: {
    fontSize: 13,
    fontWeight: "600",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  roleSection: {
    marginBottom: 12,
  },
  roleLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  modalList: {
    marginBottom: 12,
  },
  modalItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  modalItemText: {
    fontSize: 15,
  },
  modalEmptyText: {
    fontSize: 14,
    fontStyle: "italic",
    marginBottom: 12,
  },
  modalCancelButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "600",
  },
  roleHint: {
    fontSize: 13,
    fontStyle: "italic",
    marginBottom: 12,
  },
  modalActionButton: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  modalActionText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
