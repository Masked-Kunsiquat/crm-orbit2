import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { EntityLinkType } from "@domains/relations/entityLink";
import type { EntityId } from "../../domains/shared/types";
import type { AccountContactRole } from "../../domains/relations/accountContact";

// Root stack navigator
export type RootStackParamList = {
  RootTabs: undefined;
  OrganizationDetail: { organizationId: EntityId };
  OrganizationForm: { organizationId?: EntityId };
  AccountDetail: { accountId: EntityId };
  AccountFloorsVisited: { accountId: EntityId };
  AccountForm: { accountId?: EntityId; organizationId?: EntityId };
  ContactDetail: { contactId: EntityId };
  ContactForm: {
    contactId?: EntityId;
    accountLink?: {
      accountId: EntityId;
      role: AccountContactRole;
      setPrimary?: boolean;
    };
  };
  NoteDetail: { noteId: EntityId };
  NoteForm: {
    noteId?: EntityId;
    entityToLink?: {
      entityId: EntityId;
      entityType: EntityLinkType;
    };
  };
  InteractionDetail: { interactionId: EntityId };
  InteractionForm: {
    interactionId?: EntityId;
    entityToLink?: {
      entityId: EntityId;
      entityType: EntityLinkType;
    };
  };
  CodeDetail: { codeId: EntityId };
  CodeForm: { codeId?: EntityId; accountId?: EntityId };
  AuditForm: { auditId?: EntityId; accountId?: EntityId };
  AuditDetail: { auditId: EntityId };
};

// Root tab navigator
export type RootTabParamList = {
  OrganizationsTab: undefined;
  EventsTab: undefined;
  ContactsTab: undefined;
  NotesTab: undefined;
  MiscTab: undefined;
};

// Organizations stack navigator
export type OrganizationsStackParamList = {
  OrganizationsLanding: undefined;
  AccountsList: undefined;
  OrganizationsList: undefined;
  OrganizationDetail: { organizationId: EntityId };
  OrganizationForm: { organizationId?: EntityId };
};

// Accounts stack navigator
export type AccountsStackParamList = {
  AccountsList: undefined;
  AccountDetail: { accountId: EntityId };
  AccountFloorsVisited: { accountId: EntityId };
  AccountForm: { accountId?: EntityId; organizationId?: EntityId };
};

// Events stack navigator
export type EventsStackParamList = {
  EventsLanding: undefined;
  AuditsList: undefined;
  AuditDetail: { auditId: EntityId };
  AuditForm: { auditId?: EntityId; accountId?: EntityId };
  Calendar: undefined;
  InteractionsList: undefined;
  InteractionDetail: { interactionId: EntityId };
  InteractionForm: {
    interactionId?: EntityId;
    entityToLink?: {
      entityId: EntityId;
      entityType: EntityLinkType;
    };
  };
};

// Contacts stack navigator
export type ContactsStackParamList = {
  ContactsList: undefined;
  ContactDetail: { contactId: EntityId };
  ContactForm: {
    contactId?: EntityId;
    accountLink?: {
      accountId: EntityId;
      role: AccountContactRole;
      setPrimary?: boolean;
    };
  };
  ContactsImport: undefined;
};

// Notes stack navigator (now includes Codes)
export type NotesStackParamList = {
  NotesAndCodesLanding: undefined;
  CodesList: undefined;
  CodeDetail: { codeId: EntityId };
  CodeForm: { codeId?: EntityId; accountId?: EntityId };
  NotesList: undefined;
  NoteDetail: { noteId: EntityId };
  NoteForm: {
    noteId?: EntityId;
    entityToLink?: {
      entityId: EntityId;
      entityType: EntityLinkType;
    };
  };
};

// Misc stack navigator
export type MiscStackParamList = {
  MiscLanding: undefined;
  Sync: undefined;
  Randomizer: undefined;
  SettingsList: undefined;
  BackupSettings: undefined;
  SecuritySettings: undefined;
  CalendarSettings: undefined;
};

// Screen props types
export type OrganizationsStackScreenProps<
  T extends keyof OrganizationsStackParamList,
> = CompositeScreenProps<
  NativeStackScreenProps<OrganizationsStackParamList, T>,
  CompositeScreenProps<
    BottomTabScreenProps<RootTabParamList>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

export type AccountsStackScreenProps<T extends keyof AccountsStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<AccountsStackParamList, T>,
    CompositeScreenProps<
      BottomTabScreenProps<RootTabParamList>,
      NativeStackScreenProps<RootStackParamList>
    >
  >;

export type EventsStackScreenProps<T extends keyof EventsStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<EventsStackParamList, T>,
    CompositeScreenProps<
      BottomTabScreenProps<RootTabParamList>,
      NativeStackScreenProps<RootStackParamList>
    >
  >;

export type ContactsStackScreenProps<T extends keyof ContactsStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<ContactsStackParamList, T>,
    CompositeScreenProps<
      BottomTabScreenProps<RootTabParamList>,
      NativeStackScreenProps<RootStackParamList>
    >
  >;

export type NotesStackScreenProps<T extends keyof NotesStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<NotesStackParamList, T>,
    CompositeScreenProps<
      BottomTabScreenProps<RootTabParamList>,
      NativeStackScreenProps<RootStackParamList>
    >
  >;

export type MiscStackScreenProps<T extends keyof MiscStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<MiscStackParamList, T>,
    CompositeScreenProps<
      BottomTabScreenProps<RootTabParamList>,
      NativeStackScreenProps<RootStackParamList>
    >
  >;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
