import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState, useMemo } from "react";

import type { AccountsStackScreenProps } from "../../navigation/types";
import {
  useAccount,
  useContacts,
  useNotes,
  useInteractions,
  useTimeline,
  useDoc,
} from "../../store/store";
import { useAccountActions } from "../../hooks/useAccountActions";
import { useDeviceId } from "../../hooks";
import type { ContactType } from "@domains/contact";
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
} from "../../components";
import { t } from "@i18n/index";
import { useTheme } from "../../hooks/useTheme";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import {
  openMapsWithAddress,
  formatAddressForMaps,
} from "@domains/linking.utils";

type Props = AccountsStackScreenProps<"AccountDetail">;
type AccountTab = "overview" | "details" | "notes" | "activity";

export const AccountDetailScreen = ({ route, navigation }: Props) => {
  const { accountId } = route.params;
  const account = useAccount(accountId);
  const allContacts = useContacts(accountId);
  const notes = useNotes("account", accountId);
  const interactions = useInteractions("account", accountId);
  const timeline = useTimeline("account", accountId);
  const doc = useDoc();
  const deviceId = useDeviceId();
  const { deleteAccount } = useAccountActions(deviceId);
  const { colors } = useTheme();

  const { dialogProps, showDialog, showAlert } = useConfirmDialog();

  const [activeTab, setActiveTab] = useState<AccountTab>("overview");
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
        <Section>
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
                        ? colors.onAccent
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
                        ? colors.onAccent
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
                        ? colors.onAccent
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
      ) : null}

      {activeTab === "details" ? (
        <Section>
          {account.website && (
            <DetailField label={t("accounts.fields.website")}>
              <TouchableOpacity
                onPress={() => Linking.openURL(account.website!)}
              >
                <Text style={[styles.link, { color: colors.link }]}>
                  {account.website}
                </Text>
              </TouchableOpacity>
            </DetailField>
          )}

          {account.addresses?.site && (
            <DetailField label={t("accounts.fields.siteAddress")}>
              <View style={styles.addressContainer}>
                <View style={styles.addressText}>
                  <Text style={{ color: colors.textPrimary, fontSize: 16 }}>
                    {account.addresses.site.street}
                  </Text>
                  <Text style={{ color: colors.textPrimary, fontSize: 16 }}>
                    {account.addresses.site.city},{" "}
                    {account.addresses.site.state}{" "}
                    {account.addresses.site.zipCode}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    void openMapsWithAddress(
                      formatAddressForMaps(account.addresses!.site!),
                    )
                  }
                  style={styles.mapIconButton}
                >
                  <Ionicons
                    name="location-outline"
                    size={24}
                    color={colors.accent}
                  />
                </TouchableOpacity>
              </View>
            </DetailField>
          )}

          {account.addresses?.parking &&
            !account.addresses.useSameForParking && (
              <DetailField label={t("accounts.fields.parkingAddress")}>
                <View style={styles.addressContainer}>
                  <View style={styles.addressText}>
                    <Text style={{ color: colors.textPrimary, fontSize: 16 }}>
                      {account.addresses.parking.street}
                    </Text>
                    <Text style={{ color: colors.textPrimary, fontSize: 16 }}>
                      {account.addresses.parking.city},{" "}
                      {account.addresses.parking.state}{" "}
                      {account.addresses.parking.zipCode}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      void openMapsWithAddress(
                        formatAddressForMaps(account.addresses!.parking!),
                      )
                    }
                    style={styles.mapIconButton}
                  >
                    <Ionicons
                      name="location-outline"
                      size={24}
                      color={colors.accent}
                    />
                  </TouchableOpacity>
                </View>
              </DetailField>
            )}

          {account.addresses?.useSameForParking && (
            <DetailField label={t("accounts.fields.parkingAddress")}>
              {t("accounts.sameAsSiteAddress")}
            </DetailField>
          )}

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
          <NotesSection
            notes={notes}
            entityId={accountId}
            entityType="account"
            navigation={navigation}
          />
          <InteractionsSection
            interactions={interactions}
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
  emptyText: {
    fontSize: 14,
    fontStyle: "italic",
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
  addressContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  addressText: {
    flex: 1,
  },
  mapIconButton: {
    padding: 4,
  },
});
