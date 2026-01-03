import { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  FlatList,
} from "react-native";

import type { ContactsStackScreenProps } from "@views/navigation/types";
import {
  useContact,
  useAccountsByContact,
  useAccounts,
  useAccountContactRelations,
  useInteractions,
  useNotes,
  useTimeline,
  useDoc,
} from "@views/store/store";
import { useContactActions } from "@views/hooks/useContactActions";
import { useAccountActions } from "@views/hooks/useAccountActions";
import {
  formatPhoneNumber,
  getContactDisplayName,
} from "@domains/contact.utils";
import {
  NotesSection,
  InteractionsSection,
  TimelineSection,
  DetailScreenLayout,
  Section,
  DetailTabs,
  ContactTypeBadge,
  PrimaryActionButton,
  DangerActionButton,
  ConfirmDialog,
} from "@views/components";
import { useDeviceId, useTheme } from "@views/hooks";
import type { ColorScheme } from "@domains/shared/theme/colors";
import { t } from "@i18n/index";
import { useConfirmDialog } from "@views/hooks/useConfirmDialog";

type Props = ContactsStackScreenProps<"ContactDetail">;
type ContactTab = "overview" | "details" | "notes" | "activity";

export const ContactDetailScreen = ({ route, navigation }: Props) => {
  const { contactId } = route.params;
  const contact = useContact(contactId);
  const linkedAccounts = useAccountsByContact(contactId);
  const notes = useNotes("contact", contactId);
  const interactions = useInteractions("contact", contactId);
  const timeline = useTimeline("contact", contactId);
  const doc = useDoc();
  const allAccounts = useAccounts();
  const accountContactRelations = useAccountContactRelations();
  const deviceId = useDeviceId();
  const { deleteContact } = useContactActions(deviceId);
  const { linkContact, unlinkContact } = useAccountActions(deviceId);
  const { colors } = useTheme();
  const { dialogProps, showDialog, showAlert } = useConfirmDialog();

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [activeTab, setActiveTab] = useState<ContactTab>("overview");

  const styles = createStyles(colors);

  if (!contact) {
    return (
      <DetailScreenLayout>
        <Text style={styles.errorText}>{t("contacts.notFound")}</Text>
      </DetailScreenLayout>
    );
  }

  const handleEdit = () => {
    navigation.navigate("ContactForm", { contactId: contact.id });
  };

  const handleLinkAccount = (accountId: string) => {
    // Check if already linked
    const existingLink = Object.values(accountContactRelations).find(
      (relation) =>
        relation.accountId === accountId && relation.contactId === contactId,
    );

    if (existingLink) {
      showAlert(
        t("contacts.linkedAccounts.alreadyLinkedTitle"),
        t("contacts.linkedAccounts.alreadyLinkedMessage"),
        t("common.ok"),
      );
      return;
    }

    // Check if account already has a primary contact
    const hasPrimary = Object.values(accountContactRelations).some(
      (relation) => relation.accountId === accountId && relation.isPrimary,
    );

    const result = linkContact(
      accountId,
      contactId,
      "account.contact.role.primary",
      !hasPrimary,
    );

    if (result.success) {
      setShowLinkModal(false);
    } else {
      showAlert(
        t("common.error"),
        result.error ?? t("contacts.linkError"),
        t("common.ok"),
      );
    }
  };

  const handleUnlinkAccount = (accountId: string, accountName: string) => {
    showDialog({
      title: t("contacts.unlinkTitle"),
      message: t("contacts.unlinkConfirmation")
        .replace("{contactName}", getContactDisplayName(contact))
        .replace("{accountName}", accountName),
      confirmLabel: t("contacts.unlinkAction"),
      confirmVariant: "danger",
      cancelLabel: t("common.cancel"),
      onConfirm: () => {
        const result = unlinkContact(accountId, contactId);
        if (!result.success) {
          showAlert(
            t("common.error"),
            result.error ?? t("contacts.unlinkError"),
            t("common.ok"),
          );
        }
      },
    });
  };

  const handleDelete = () => {
    if (linkedAccounts.length > 0) {
      showAlert(
        t("contacts.cannotDeleteTitle"),
        t("contacts.cannotDeleteMessage")
          .replace("{name}", getContactDisplayName(contact))
          .replace("{count}", linkedAccounts.length.toString()),
        t("common.ok"),
      );
      return;
    }

    showDialog({
      title: t("contacts.deleteTitle"),
      message: t("contacts.deleteConfirmation").replace(
        "{name}",
        getContactDisplayName(contact),
      ),
      confirmLabel: t("common.delete"),
      confirmVariant: "danger",
      cancelLabel: t("common.cancel"),
      onConfirm: () => {
        const result = deleteContact(contact.id);
        if (result.success) {
          navigation.goBack();
        } else {
          showAlert(
            t("common.error"),
            result.error ?? t("contacts.deleteError"),
            t("common.ok"),
          );
        }
      },
    });
  };

  const getMethodLabel = (label: string) => {
    return t(label);
  };

  const getMethodKey = (
    method: { id?: string; label: string; status: string; value: string },
    index: number,
  ) => method.id || `${method.label}-${method.status}-${method.value}-${index}`;

  return (
    <DetailScreenLayout>
      <Section>
        <View style={styles.header}>
          <Text style={styles.title}>{getContactDisplayName(contact)}</Text>
          <PrimaryActionButton
            label={t("common.edit")}
            onPress={handleEdit}
            size="compact"
          />
        </View>
        <View style={styles.metaRow}>
          {contact.title ? (
            <Text style={styles.subtitle}>{contact.title}</Text>
          ) : null}
          <ContactTypeBadge
            type={contact.type}
            style={[
              styles.typeBadge,
              contact.title ? styles.typeBadgeWithTitle : null,
            ]}
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
            <Text style={styles.sectionTitle}>
              {t("contacts.sections.emails")} ({contact.methods.emails.length})
            </Text>
            {contact.methods.emails.length === 0 ? (
              <Text style={styles.emptyText}>{t("contacts.emptyEmails")}</Text>
            ) : (
              contact.methods.emails.map((email, index) => (
                <View
                  key={getMethodKey(email, index)}
                  style={styles.methodItem}
                >
                  <Text style={styles.methodValue}>{email.value}</Text>
                  <Text style={styles.methodMeta}>
                    {getMethodLabel(email.label)} • {t(email.status)}
                  </Text>
                </View>
              ))
            )}
          </Section>

          <Section>
            <Text style={styles.sectionTitle}>
              {t("contacts.sections.phones")} ({contact.methods.phones.length})
            </Text>
            {contact.methods.phones.length === 0 ? (
              <Text style={styles.emptyText}>{t("contacts.emptyPhones")}</Text>
            ) : (
              contact.methods.phones.map((phone, index) => (
                <View
                  key={getMethodKey(phone, index)}
                  style={styles.methodItem}
                >
                  <Text style={styles.methodValue}>
                    {formatPhoneNumber(phone.value)}
                  </Text>
                  <Text style={styles.methodMeta}>
                    {getMethodLabel(phone.label)} • {t(phone.status)}
                  </Text>
                </View>
              ))
            )}
          </Section>
        </>
      ) : null}

      {activeTab === "details" ? (
        <Section>
          <View style={styles.fieldHeader}>
            <Text style={styles.sectionTitle}>
              {t("contacts.sections.linkedAccounts")} ({linkedAccounts.length})
            </Text>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => setShowLinkModal(true)}
            >
              <Text style={styles.linkButtonText}>
                {t("contacts.linkedAccounts.linkButton")}
              </Text>
            </TouchableOpacity>
          </View>
          {linkedAccounts.length === 0 ? (
            <Text style={styles.emptyText}>
              {t("contacts.linkedAccounts.empty")}
            </Text>
          ) : (
            linkedAccounts.map((account) => {
              const relation = Object.values(accountContactRelations).find(
                (r) => r.accountId === account.id && r.contactId === contactId,
              );
              return (
                <View key={account.id} style={styles.accountItem}>
                  <View style={styles.accountInfo}>
                    <Text style={styles.accountName}>{account.name}</Text>
                    {relation?.isPrimary && (
                      <View style={styles.primaryBadge}>
                        <Text style={styles.primaryText}>
                          {t("contacts.linkedAccounts.primaryBadge")}
                        </Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.unlinkButton}
                    onPress={() =>
                      handleUnlinkAccount(account.id, account.name)
                    }
                  >
                    <Text style={styles.unlinkButtonText}>
                      {t("contacts.unlinkAction")}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </Section>
      ) : null}

      {activeTab === "notes" ? (
        <>
          <NotesSection
            notes={notes}
            entityId={contactId}
            entityType="contact"
            navigation={navigation}
          />
          <InteractionsSection
            interactions={interactions}
            entityId={contactId}
            entityType="contact"
            navigation={navigation}
          />
        </>
      ) : null}

      {activeTab === "activity" ? (
        <TimelineSection timeline={timeline} doc={doc} />
      ) : null}

      <DangerActionButton
        label={t("contacts.deleteButton")}
        onPress={handleDelete}
        size="block"
      />

      <Modal
        visible={showLinkModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLinkModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {t("contacts.linkedAccounts.modalTitle")}
            </Text>
            <FlatList
              data={allAccounts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isLinked = linkedAccounts.some((a) => a.id === item.id);
                return (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      isLinked && styles.modalItemDisabled,
                    ]}
                    onPress={() => handleLinkAccount(item.id)}
                    disabled={isLinked}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        isLinked && styles.modalItemTextDisabled,
                      ]}
                    >
                      {item.name}
                      {isLinked &&
                        t("contacts.linkedAccounts.alreadyLinkedSuffix")}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowLinkModal(false)}
            >
              <Text style={styles.modalCancelText}>{t("common.cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {dialogProps ? <ConfirmDialog {...dialogProps} /> : null}
    </DetailScreenLayout>
  );
};

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.textPrimary,
      flex: 1,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      marginTop: 4,
    },
    typeBadge: {
      alignSelf: "center",
    },
    typeBadgeWithTitle: {
      marginLeft: 8,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    methodItem: {
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    methodValue: {
      fontSize: 15,
      color: colors.textPrimary,
      marginBottom: 2,
    },
    methodMeta: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textMuted,
      fontStyle: "italic",
    },
    errorText: {
      fontSize: 16,
      color: colors.error,
      textAlign: "center",
      marginTop: 32,
    },
    fieldHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    linkButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: colors.accent,
    },
    linkButtonText: {
      fontSize: 14,
      color: colors.onAccent,
      fontWeight: "600",
    },
    accountItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    accountInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    accountName: {
      fontSize: 15,
      color: colors.textPrimary,
    },
    unlinkButton: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: colors.errorBg,
    },
    unlinkButtonText: {
      fontSize: 12,
      color: colors.error,
      fontWeight: "600",
    },
    primaryBadge: {
      backgroundColor: colors.successBg,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    primaryText: {
      fontSize: 12,
      color: colors.success,
      fontWeight: "600",
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 16,
      maxHeight: "80%",
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: 16,
    },
    modalItem: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    modalItemDisabled: {
      opacity: 0.5,
    },
    modalItemText: {
      fontSize: 16,
      color: colors.textPrimary,
    },
    modalItemTextDisabled: {
      color: colors.textMuted,
    },
    modalCancelButton: {
      marginTop: 16,
      padding: 16,
      backgroundColor: colors.borderLight,
      borderRadius: 8,
      alignItems: "center",
    },
    modalCancelText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textSecondary,
    },
  });
