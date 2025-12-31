import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { EntityId } from "../../domains/shared/types";

// Root tab navigator
export type RootTabParamList = {
  OrganizationsTab: undefined;
  AccountsTab: undefined;
  ContactsTab: undefined;
  NotesTab: undefined;
  InteractionsTab: undefined;
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
  AccountForm: { accountId?: EntityId };
};

// Contacts stack navigator
export type ContactsStackParamList = {
  ContactsList: undefined;
  ContactDetail: { contactId: EntityId };
  ContactForm: { contactId?: EntityId };
};

// Notes stack navigator
export type NotesStackParamList = {
  NotesList: undefined;
  NoteDetail: { noteId: EntityId };
  NoteForm: { noteId?: EntityId };
};

// Interactions stack navigator
export type InteractionsStackParamList = {
  InteractionsList: undefined;
  InteractionDetail: { interactionId: EntityId };
  InteractionForm: { interactionId?: EntityId };
};

// Screen props types
export type OrganizationsStackScreenProps<
  T extends keyof OrganizationsStackParamList,
> = CompositeScreenProps<
  NativeStackScreenProps<OrganizationsStackParamList, T>,
  BottomTabScreenProps<RootTabParamList>
>;

export type AccountsStackScreenProps<T extends keyof AccountsStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<AccountsStackParamList, T>,
    BottomTabScreenProps<RootTabParamList>
  >;

export type ContactsStackScreenProps<T extends keyof ContactsStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<ContactsStackParamList, T>,
    BottomTabScreenProps<RootTabParamList>
  >;

export type NotesStackScreenProps<T extends keyof NotesStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<NotesStackParamList, T>,
    BottomTabScreenProps<RootTabParamList>
  >;

export type InteractionsStackScreenProps<
  T extends keyof InteractionsStackParamList,
> = CompositeScreenProps<
  NativeStackScreenProps<InteractionsStackParamList, T>,
  BottomTabScreenProps<RootTabParamList>
>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootTabParamList {}
  }
}
