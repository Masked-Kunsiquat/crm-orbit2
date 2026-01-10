import { t } from "@i18n/index";
import type { ContactMethodLabel, ContactType } from "@domains/contact";

export const useContactsStackTitles = () => ({
  list: t("contacts.title"),
  detail: t("contacts.detailTitle"),
  formNew: t("contacts.form.newTitle"),
  formEdit: t("contacts.form.editTitle"),
  import: t("contacts.import.title"),
});

export const useContactsListLabels = () => ({
  listOptions: t("contacts.listOptions"),
  emptyTitle: t("contacts.emptyTitle"),
  emptyHint: t("contacts.emptyHint"),
  sortByFirstName: t("contacts.sortByFirstName"),
  sortByLastName: t("contacts.sortByLastName"),
  importAction: t("contacts.import.action"),
});

export const useContactImportLabels = () => ({
  title: t("contacts.import.title"),
  description: t("contacts.import.description"),
  pickAction: t("contacts.import.pickAction"),
  pickAnotherAction: t("contacts.import.pickAnotherAction"),
  selectedTitle: t("contacts.import.selectedTitle"),
  selectedEmpty: t("contacts.import.selectedEmpty"),
  removeAction: t("contacts.import.removeAction"),
  startAction: t("contacts.import.startAction"),
  mappingTitle: (current: number, total: number) =>
    t("contacts.import.mappingTitle", { current, total }),
  mappingHint: t("contacts.import.mappingHint"),
  backAction: t("contacts.import.backAction"),
  skipAction: t("contacts.import.skipAction"),
  saveNextAction: t("contacts.import.saveNextAction"),
  saveFinishAction: t("contacts.import.saveFinishAction"),
  reviewTitle: t("contacts.import.reviewTitle"),
  reviewHint: t("contacts.import.reviewHint"),
  reviewEmpty: t("contacts.import.reviewEmpty"),
  reviewEdit: t("contacts.import.reviewEdit"),
  doneAction: t("contacts.import.doneAction"),
  unavailable: t("contacts.import.error.unavailable"),
  permissionDenied: t("contacts.import.error.permissionDenied"),
  duplicate: t("contacts.import.error.duplicate"),
  loadFailed: t("contacts.import.error.loadFailed"),
  saveFailed: t("contacts.import.error.saveFailed"),
  unknownName: t("common.unknown"),
  errorTitle: t("common.error"),
  validationTitle: t("common.validationError"),
  okAction: t("common.ok"),
  nameRequired: t("contacts.validation.nameRequired"),
  firstNameLabel: t("contacts.form.firstNameLabel"),
  firstNamePlaceholder: t("contacts.form.firstNamePlaceholder"),
  lastNameLabel: t("contacts.form.lastNameLabel"),
  lastNamePlaceholder: t("contacts.form.lastNamePlaceholder"),
  nameHint: t("contacts.form.nameHint"),
  titleLabel: t("contacts.form.titleLabel"),
  titlePlaceholder: t("contacts.form.titlePlaceholder"),
  typeLabel: t("contacts.form.typeLabel"),
  emailsLabel: t("contacts.form.emailsLabel"),
  phonesLabel: t("contacts.form.phonesLabel"),
  emailPlaceholder: t("contacts.form.emailPlaceholder"),
  phonePlaceholder: t("contacts.form.phonePlaceholder"),
  phoneExtensionPlaceholder: t("contacts.form.phoneExtensionPlaceholder"),
  addAction: t("contacts.form.addAction"),
  typeOptions: [
    {
      value: "contact.type.internal",
      label: t("contact.type.internal"),
    },
    {
      value: "contact.type.external",
      label: t("contact.type.external"),
    },
    {
      value: "contact.type.vendor",
      label: t("contact.type.vendor"),
    },
  ] as ReadonlyArray<{ value: ContactType; label: string }>,
  emailLabelOptions: [
    {
      value: "contact.method.label.work",
      label: t("contact.method.label.work"),
    },
    {
      value: "contact.method.label.personal",
      label: t("contact.method.label.personal"),
    },
    {
      value: "contact.method.label.other",
      label: t("contact.method.label.other"),
    },
  ] as ReadonlyArray<{ value: ContactMethodLabel; label: string }>,
  phoneLabelOptions: [
    {
      value: "contact.method.label.work",
      label: t("contact.method.label.work"),
    },
    {
      value: "contact.method.label.personal",
      label: t("contact.method.label.personal"),
    },
    {
      value: "contact.method.label.mobile",
      label: t("contact.method.label.mobile"),
    },
    {
      value: "contact.method.label.other",
      label: t("contact.method.label.other"),
    },
  ] as ReadonlyArray<{ value: ContactMethodLabel; label: string }>,
});
