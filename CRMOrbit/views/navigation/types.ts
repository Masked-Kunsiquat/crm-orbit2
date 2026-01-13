import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { CalendarEventType } from "@domains/calendarEvent";
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
  // DEPRECATED - kept for backward compatibility during migration
  InteractionDetail: { interactionId: EntityId };
  InteractionForm: {
    interactionId?: EntityId;
    entityToLink?: {
      entityId: EntityId;
      entityType: EntityLinkType;
    };
    prefillDate?: string;
  };
  AuditForm: { auditId?: EntityId; accountId?: EntityId; prefillDate?: string };
  AuditDetail: { auditId: EntityId };
  // NEW - unified calendar event screens
  CalendarEventDetail: {
    calendarEventId: EntityId;
    occurrenceTimestamp?: string;
  };
  CalendarEventForm: {
    calendarEventId?: EntityId;
    entityToLink?: {
      entityId: EntityId;
      entityType: EntityLinkType;
    };
    accountId?: EntityId; // For audits
    prefillDate?: string;
    prefillType?: CalendarEventType;
  };
  CodeDetail: { codeId: EntityId };
  CodeForm: { codeId?: EntityId; accountId?: EntityId };
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
  // DEPRECATED - kept for backward compatibility during migration
  AuditsList: undefined;
  AuditDetail: { auditId: EntityId };
  AuditForm: { auditId?: EntityId; accountId?: EntityId; prefillDate?: string };
  InteractionsList: undefined;
  InteractionDetail: { interactionId: EntityId };
  InteractionForm: {
    interactionId?: EntityId;
    entityToLink?: {
      entityId: EntityId;
      entityType: EntityLinkType;
    };
    prefillDate?: string;
  };
  // NEW - unified calendar event screens
  Calendar: undefined;
  CalendarEventsList: undefined;
  CalendarEventDetail: {
    calendarEventId: EntityId;
    occurrenceTimestamp?: string;
  };
  CalendarEventForm: {
    calendarEventId?: EntityId;
    entityToLink?: {
      entityId: EntityId;
      entityType: EntityLinkType;
    };
    accountId?: EntityId; // For audits
    prefillDate?: string;
    prefillType?: CalendarEventType;
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
