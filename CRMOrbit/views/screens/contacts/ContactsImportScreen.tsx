import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { ContactsStackScreenProps } from "@views/navigation/types";
import {
  ActionButton,
  ConfirmDialog,
  FormField,
  FormScreenLayout,
  ListRow,
  MethodListEditor,
  Section,
  SegmentedOptionGroup,
  TextField,
} from "@views/components";
import {
  useContactImport,
  useContactImportLabels,
  useTheme,
} from "@views/hooks";
import { useConfirmDialog } from "@views/hooks/useConfirmDialog";
import { getContactImportDisplayName } from "@views/utils/contactImport";

type Props = ContactsStackScreenProps<"ContactsImport">;

export const ContactsImportScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const labels = useContactImportLabels();
  const { dialogProps, showAlert } = useConfirmDialog();
  const {
    step,
    selectedContacts,
    currentIndex,
    currentDraft,
    importedContacts,
    isPicking,
    pickContact,
    startMapping,
    backToSelection,
    removeSelectedContact,
    updateFirstName,
    updateLastName,
    updateTitle,
    updateType,
    addEmail,
    updateEmail,
    updateEmailLabel,
    removeEmail,
    addPhone,
    updatePhone,
    updatePhoneExtension,
    updatePhoneLabel,
    removePhone,
    skipCurrent,
    saveCurrent,
  } = useContactImport();

  const handlePickContact = async () => {
    const result = await pickContact();
    if (result.ok || result.error === "cancelled") {
      return;
    }
    const message =
      result.error === "permissionDenied"
        ? labels.permissionDenied
        : result.error === "unavailable"
          ? labels.unavailable
          : result.error === "duplicate"
            ? labels.duplicate
            : labels.loadFailed;
    showAlert(labels.errorTitle, message, labels.okAction);
  };

  const handleSaveCurrent = () => {
    const result = saveCurrent();
    if (result.ok) return;
    if (result.error === "nameRequired") {
      showAlert(labels.validationTitle, labels.nameRequired, labels.okAction);
      return;
    }
    showAlert(
      labels.errorTitle,
      result.message ?? labels.saveFailed,
      labels.okAction,
    );
  };

  const currentName =
    (currentDraft ? getContactImportDisplayName(currentDraft) : "") ||
    labels.unknownName;

  const isLast = currentIndex >= selectedContacts.length - 1;

  return (
    <FormScreenLayout>
      {step === "select" ? (
        <>
          <Section title={labels.title}>
            <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
              {labels.description}
            </Text>
            <ActionButton
              label={
                selectedContacts.length > 0
                  ? labels.pickAnotherAction
                  : labels.pickAction
              }
              onPress={handlePickContact}
              disabled={isPicking}
            />
          </Section>

          <Section title={labels.selectedTitle}>
            {selectedContacts.length === 0 ? (
              <Text style={[styles.bodyText, { color: colors.textMuted }]}>
                {labels.selectedEmpty}
              </Text>
            ) : (
              <View style={styles.selectedList}>
                {selectedContacts.map((contact) => {
                  const name =
                    getContactImportDisplayName(contact) || labels.unknownName;
                  return (
                    <View
                      key={contact.sourceId}
                      style={[
                        styles.selectedItem,
                        {
                          backgroundColor: colors.surfaceElevated,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.selectedName,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {name}
                      </Text>
                      <ActionButton
                        label={labels.removeAction}
                        onPress={() => removeSelectedContact(contact.sourceId)}
                        size="compact"
                        tone="link"
                      />
                    </View>
                  );
                })}
              </View>
            )}
          </Section>

          <ActionButton
            label={labels.startAction}
            onPress={startMapping}
            size="block"
            disabled={selectedContacts.length === 0}
          />
        </>
      ) : null}

      {step === "map" ? (
        currentDraft ? (
          <>
            <Section>
              <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
                {labels.mappingTitle(currentIndex + 1, selectedContacts.length)}
              </Text>
              <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
                {labels.mappingHint}
              </Text>
            </Section>

            <Section title={currentName}>
              <FormField label={labels.firstNameLabel}>
                <TextField
                  value={currentDraft.firstName}
                  onChangeText={updateFirstName}
                  placeholder={labels.firstNamePlaceholder}
                  autoCapitalize="words"
                />
              </FormField>

              <FormField label={labels.lastNameLabel} hint={labels.nameHint}>
                <TextField
                  value={currentDraft.lastName}
                  onChangeText={updateLastName}
                  placeholder={labels.lastNamePlaceholder}
                  autoCapitalize="words"
                />
              </FormField>

              <FormField label={labels.titleLabel}>
                <TextField
                  value={currentDraft.title}
                  onChangeText={updateTitle}
                  placeholder={labels.titlePlaceholder}
                />
              </FormField>

              <FormField label={labels.typeLabel}>
                <SegmentedOptionGroup
                  options={labels.typeOptions}
                  value={currentDraft.type}
                  onChange={updateType}
                />
              </FormField>

              <MethodListEditor
                label={labels.emailsLabel}
                methods={currentDraft.emails}
                onAdd={addEmail}
                onChange={updateEmail}
                onLabelChange={updateEmailLabel}
                onRemove={removeEmail}
                placeholder={labels.emailPlaceholder}
                addLabel={labels.addAction}
                labelOptions={labels.emailLabelOptions}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <MethodListEditor
                label={labels.phonesLabel}
                methods={currentDraft.phones}
                onAdd={addPhone}
                onChange={updatePhone}
                onSecondaryChange={updatePhoneExtension}
                onLabelChange={updatePhoneLabel}
                onRemove={removePhone}
                placeholder={labels.phonePlaceholder}
                secondaryPlaceholder={labels.phoneExtensionPlaceholder}
                addLabel={labels.addAction}
                labelOptions={labels.phoneLabelOptions}
                keyboardType="phone-pad"
                secondaryKeyboardType="number-pad"
                autoCapitalize="none"
                secondaryAutoCapitalize="none"
              />
            </Section>

            <View style={styles.mappingActions}>
              <View style={styles.mappingRow}>
                <ActionButton
                  label={labels.backAction}
                  onPress={backToSelection}
                  tone="link"
                />
                <ActionButton
                  label={labels.skipAction}
                  onPress={skipCurrent}
                  tone="link"
                />
              </View>
              <ActionButton
                label={isLast ? labels.saveFinishAction : labels.saveNextAction}
                onPress={handleSaveCurrent}
                size="block"
              />
            </View>
          </>
        ) : (
          <Section>
            <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
              {labels.selectedEmpty}
            </Text>
            <TouchableOpacity onPress={backToSelection}>
              <Text style={[styles.linkText, { color: colors.link }]}>
                {labels.backAction}
              </Text>
            </TouchableOpacity>
          </Section>
        )
      ) : null}

      {step === "review" ? (
        <>
          <Section title={labels.reviewTitle}>
            <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
              {labels.reviewHint}
            </Text>
          </Section>

          <Section>
            {importedContacts.length === 0 ? (
              <Text style={[styles.bodyText, { color: colors.textMuted }]}>
                {labels.reviewEmpty}
              </Text>
            ) : (
              importedContacts.map((contact) => (
                <ListRow
                  key={contact.id}
                  title={contact.name || labels.unknownName}
                  onPress={() =>
                    navigation.navigate("ContactDetail", {
                      contactId: contact.id,
                    })
                  }
                  showChevron
                >
                  <ActionButton
                    label={labels.reviewEdit}
                    onPress={() =>
                      navigation.navigate("ContactForm", {
                        contactId: contact.id,
                      })
                    }
                    size="compact"
                    tone="link"
                  />
                </ListRow>
              ))
            )}
          </Section>

          <ActionButton
            label={labels.doneAction}
            onPress={() => navigation.goBack()}
            size="block"
          />
        </>
      ) : null}

      {dialogProps ? <ConfirmDialog {...dialogProps} /> : null}
    </FormScreenLayout>
  );
};

const styles = StyleSheet.create({
  bodyText: {
    fontSize: 14,
    marginBottom: 12,
  },
  linkText: {
    fontSize: 14,
    fontWeight: "600",
  },
  selectedList: {
    gap: 12,
  },
  selectedItem: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedName: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  mappingActions: {
    marginTop: 8,
  },
  mappingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
});
