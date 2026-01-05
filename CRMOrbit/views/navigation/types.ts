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
  AccountsTab: undefined;
  ContactsTab: undefined;
  NotesTab: undefined;
  MiscTab: undefined;
};

// Organizations stack navigator
export type OrganizationsStackParamList = {
  OrganizationsList: undefined;
  OrganizationDetail: { organizationId: EntityId };
  OrganizationForm: { organizationId?: EntityId };
};

// Accounts stack navigator
export type AccountsStackParamList = {
  AccountsList: undefined;
  AccountDetail: { accountId: EntityId };
  AccountForm: { accountId?: EntityId; organizationId?: EntityId };
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
};

// Notes stack navigator (now includes Interactions)
export type NotesStackParamList = {
  NotesAndInteractionsLanding: undefined;
  NotesList: undefined;
  NoteDetail: { noteId: EntityId };
  NoteForm: {
    noteId?: EntityId;
    entityToLink?: {
      entityId: EntityId;
      entityType: EntityLinkType;
    };
  };
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

// Misc stack navigator
export type MiscStackParamList = {
  MiscLanding: undefined;
  Sync: undefined;
  CodesList: undefined;
  Calendar: undefined;
  AuditsList: undefined;
  AuditDetail: { auditId: EntityId };
  InteractionDetail: { interactionId: EntityId };
  CodeDetail: { codeId: EntityId };
  CodeForm: { codeId?: EntityId; accountId?: EntityId };
  InteractionForm: {
    interactionId?: EntityId;
    entityToLink?: {
      entityId: EntityId;
      entityType: EntityLinkType;
    };
  };
  SettingsList: undefined;
  SecuritySettings: undefined;
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
