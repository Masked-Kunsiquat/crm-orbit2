import { useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  FlatList,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

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
import type { AccountContactRole } from "@domains/relations/accountContact";
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
  SegmentedOptionGroup,
} from "@views/components";
import { useDeviceId, useTheme } from "@views/hooks";
import type { ColorScheme } from "@domains/shared/theme/colors";
import { t } from "@i18n/index";
import { useConfirmDialog } from "@views/hooks/useConfirmDialog";
import {
  openPhoneDialer,
  openSMS,
  openEmailComposer,
} from "@domains/linking.utils";

type Props = ContactsStackScreenProps<"ContactDetail">;
type ContactTab = "overview" | "details" | "notes" | "activity";
const PREVIEW_LIMIT = 3;

export const ContactDetailScreen = ({ route, navigation }: Props) => {
  const { contactId } = route.params;
  const contact = useContact(contactId);
  const linkedAccounts = useAccountsByContact(contactId);
  const notes = useNotes("contact", contactId);
  const interactions = useInteractions("contact", contactId);
  const timeline = useTimeline("contact", contactId);
  const doc = useDoc();
  const allAccounts = useAccounts();
  const sortedAccounts = useMemo(
    () =>
      [...allAccounts].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      ),
    [allAccounts],
  );
  const accountContactRelations = useAccountContactRelations();
  const deviceId = useDeviceId();
  const { deleteContact } = useContactActions(deviceId);
  const { linkContact, unlinkContact } = useAccountActions(deviceId);
  const { colors } = useTheme();
  const { dialogProps, showDialog, showAlert } = useConfirmDialog();

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [activeTab, setActiveTab] = useState<ContactTab>("overview");
  const [selectedRole, setSelectedRole] = useState<AccountContactRole>(
    "account.contact.role.primary",
  );
  const [showAccountsModal, setShowAccountsModal] = useState(false);

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

  const styles = createStyles(colors);
  const previewLinkedAccounts = linkedAccounts.slice(0, PREVIEW_LIMIT);
  const hasMoreLinkedAccounts = linkedAccounts.length > PREVIEW_LIMIT;

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

  const handleLinkAccount = (accountId: string, role: AccountContactRole) => {
    // Check if already linked
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

    // Check if account already has a primary contact
    const hasPrimary = Object.values(accountContactRelations).some(
      (relation) =>
        relation.accountId === accountId &&
        relation.role === role &&
        relation.isPrimary,
    );

    const result = linkContact(accountId, contactId, role, !hasPrimary);

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

  const handleLinkingError = (error: unknown) => {
    const message = error instanceof Error ? error.message : t("common.error");
    showAlert(t("common.error"), message, t("common.ok"));
  };

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
                  <View style={styles.methodContent}>
                    <View style={styles.methodTextContainer}>
                      <View style={styles.methodValueRow}>
                        <Text style={styles.methodValue}>{email.value}</Text>
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel={t("compose_email", {
                            email: email.value,
                          })}
                          accessible={true}
                          onPress={() => {
                            void openEmailComposer(email.value);
                          }}
                          style={styles.actionIcon}
                        >
                          <Ionicons
                            name="mail-outline"
                            size={22}
                            color={colors.accent}
                          />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.methodMeta}>
                        {getMethodLabel(email.label)} • {t(email.status)}
                      </Text>
                    </View>
                  </View>
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
              contact.methods.phones.map((phone, index) => {
                const formattedPhone = formatPhoneNumber(phone.value);
                const methodLabel = getMethodLabel(phone.label);
                const callLabel = t("call_phone")
                  .replace("{label}", methodLabel)
                  .replace("{phone}", formattedPhone);
                const smsLabel = t("send_sms")
                  .replace("{label}", methodLabel)
                  .replace("{phone}", formattedPhone);

                return (
                  <View
                    key={getMethodKey(phone, index)}
                    style={styles.methodItem}
                  >
                    <View style={styles.methodContent}>
                      <View style={styles.methodTextContainer}>
                        <Text style={styles.methodValue}>{formattedPhone}</Text>
                        <Text style={styles.methodMeta}>
                          {methodLabel} • {t(phone.status)}
                        </Text>
                      </View>
                      <View style={styles.methodActions}>
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel={callLabel}
                          onPress={() => {
                            void openPhoneDialer(phone.value).catch(
                              handleLinkingError,
                            );
                          }}
                          style={styles.actionIcon}
                        >
                          <Ionicons
                            name="call-outline"
                            size={20}
                            color={colors.accent}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel={smsLabel}
                          onPress={() => {
                            void openSMS(phone.value).catch(handleLinkingError);
                          }}
                          style={styles.actionIcon}
                        >
                          <MaterialCommunityIcons
                            name="message-text-outline"
                            size={20}
                            color={colors.accent}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
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
              style={[
                styles.iconButton,
                { backgroundColor: colors.surfaceElevated },
              ]}
              onPress={() => setShowLinkModal(true)}
              accessibilityLabel={t("contacts.linkedAccounts.linkButton")}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons
                name="link-variant-plus"
                size={18}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
          </View>
          {linkedAccounts.length === 0 ? (
            <Text style={styles.emptyText}>
              {t("contacts.linkedAccounts.empty")}
            </Text>
          ) : (
            previewLinkedAccounts.map((account) => {
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
                    style={[
                      styles.iconButton,
                      { backgroundColor: colors.errorBg },
                    ]}
                    onPress={() =>
                      handleUnlinkAccount(account.id, account.name)
                    }
                    accessibilityLabel={t("contacts.unlinkAction")}
                    accessibilityRole="button"
                  >
                    <MaterialCommunityIcons
                      name="link-variant-minus"
                      size={18}
                      color={colors.error}
                    />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
          {hasMoreLinkedAccounts ? (
            <TouchableOpacity
              style={[styles.viewAllButton, { borderColor: colors.border }]}
              onPress={() => setShowAccountsModal(true)}
            >
              <Text style={[styles.viewAllText, { color: colors.accent }]}>
                {t("common.viewAll")}
              </Text>
            </TouchableOpacity>
          ) : null}
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
        visible={showAccountsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAccountsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t("contacts.sections.linkedAccounts")} (
                {linkedAccounts.length})
              </Text>
              <TouchableOpacity
                onPress={() => setShowAccountsModal(false)}
                accessibilityLabel={t("common.cancel")}
              >
                <Text style={styles.modalClose}>{t("common.cancel")}</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={linkedAccounts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const relation = Object.values(accountContactRelations).find(
                  (r) =>
                    r.accountId === item.id && r.contactId === contactId,
                );
                return (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      { borderBottomColor: colors.borderLight },
                    ]}
                    onPress={() => {
                      setShowAccountsModal(false);
                      navigation.navigate("AccountDetail", {
                        accountId: item.id,
                      });
                    }}
                  >
                    <Text style={styles.modalItemText}>{item.name}</Text>
                    {relation?.isPrimary && (
                      <Text style={styles.modalItemBadge}>
                        {t("contacts.linkedAccounts.primaryBadge")}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

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
            <View style={styles.roleSection}>
              <Text style={styles.roleLabel}>
                {t("accountContacts.roleLabel")}
              </Text>
              <SegmentedOptionGroup
                options={roleOptions}
                value={selectedRole}
                onChange={setSelectedRole}
              />
            </View>
            <FlatList
              data={sortedAccounts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isLinked = linkedAccounts.some((a) => a.id === item.id);
                return (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      isLinked && styles.modalItemDisabled,
                    ]}
                    onPress={() => handleLinkAccount(item.id, selectedRole)}
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
    iconButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
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
    viewAllButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 8,
      alignItems: "center",
      marginTop: 8,
    },
    viewAllText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.accent,
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
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    modalClose: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.accent,
    },
    roleSection: {
      marginBottom: 16,
    },
    roleLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: 8,
      textTransform: "uppercase",
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
    modalItemBadge: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.success,
      marginTop: 4,
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
    methodContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
    },
    methodTextContainer: {
      flex: 1,
    },
    methodValueRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    methodActions: {
      flexDirection: "row",
      gap: 12,
      marginLeft: 12,
    },
    actionIcon: {
      padding: 12,
    },
  });
