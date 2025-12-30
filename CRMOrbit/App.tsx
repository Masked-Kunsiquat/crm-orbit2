import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  applyEvents,
  buildEvent,
  registerCoreReducers,
} from "./crm-core/events/dispatcher";
import type { Event } from "./crm-core/events/event";
import { useCrmStore } from "./crm-core/views/store";

registerCoreReducers();

const DEVICE_ID = "device-local";
let idCounter = 0;

const nextId = (prefix: string): string => {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
};

const Section = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const ActionButton = ({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    style={({ pressed }) => [
      styles.button,
      disabled ? styles.buttonDisabled : null,
      pressed && !disabled ? styles.buttonPressed : null,
    ]}
    disabled={disabled}
  >
    <Text style={styles.buttonLabel}>{label}</Text>
  </Pressable>
);

export default function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastEventType, setLastEventType] = useState<string | null>(null);
  const doc = useCrmStore((state) => state.doc);
  const events = useCrmStore((state) => state.events);
  const setDoc = useCrmStore((state) => state.setDoc);
  const setEvents = useCrmStore((state) => state.setEvents);

  const organizations = useMemo(
    () => Object.values(doc.organizations),
    [doc.organizations],
  );
  const accounts = useMemo(() => Object.values(doc.accounts), [doc.accounts]);
  const contacts = useMemo(() => Object.values(doc.contacts), [doc.contacts]);
  const notes = useMemo(() => Object.values(doc.notes), [doc.notes]);
  const interactions = useMemo(
    () => Object.values(doc.interactions),
    [doc.interactions],
  );

  const dispatchEvents = (nextEvents: Event[]) => {
    if (nextEvents.length === 0) {
      return;
    }

    setIsProcessing(true);
    setLastError(null);
    setLastEventType(nextEvents[nextEvents.length - 1]?.type ?? null);

    try {
      const nextDoc = applyEvents(doc, nextEvents);
      setDoc(nextDoc);
      setEvents([...events, ...nextEvents]);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "Unknown error.");
    } finally {
      setTimeout(() => setIsProcessing(false), 250);
    }
  };

  const addOrganization = () => {
    const id = nextId("org");
    dispatchEvents([
      buildEvent({
        type: "organization.created",
        entityId: id,
        payload: {
          id,
          name: `Organization ${organizations.length + 1}`,
          status: "organization.status.active",
        },
        deviceId: DEVICE_ID,
      }),
    ]);
  };

  const addAccount = () => {
    const organization = organizations[0];
    if (!organization) {
      return;
    }

    const id = nextId("account");
    dispatchEvents([
      buildEvent({
        type: "account.created",
        entityId: id,
        payload: {
          id,
          organizationId: organization.id,
          name: `Account ${accounts.length + 1}`,
          status: "account.status.active",
        },
        deviceId: DEVICE_ID,
      }),
    ]);
  };

  const addContact = () => {
    const id = nextId("contact");
    const contactEvent = buildEvent({
      type: "contact.created",
      entityId: id,
      payload: {
        id,
        type: "contact.type.internal",
        name: `Contact ${contacts.length + 1}`,
        methods: {
          emails: [
            {
              value: `contact${contacts.length + 1}@example.com`,
              label: "contact.method.label.work",
              status: "contact.method.status.active",
            },
          ],
          phones: [],
        },
      },
      deviceId: DEVICE_ID,
    });

    const account = accounts[0];
    if (!account) {
      dispatchEvents([contactEvent]);
      return;
    }

    const existingPrimary = Object.values(
      doc.relations.accountContacts,
    ).some(
      (relation) =>
        relation.accountId === account.id &&
        relation.role === "account.contact.role.primary" &&
        relation.isPrimary,
    );

    const relationId = nextId("accountContact");
    const linkEvent = buildEvent({
      type: "account.contact.linked",
      entityId: relationId,
      payload: {
        id: relationId,
        accountId: account.id,
        contactId: id,
        role: "account.contact.role.primary",
        isPrimary: !existingPrimary,
      },
      deviceId: DEVICE_ID,
    });

    dispatchEvents([contactEvent, linkEvent]);
  };

  const addNote = () => {
    const id = nextId("note");
    const noteEvent = buildEvent({
      type: "note.created",
      entityId: id,
      payload: {
        id,
        title: `Note ${notes.length + 1}`,
        body: "Quick update captured in the field.",
      },
      deviceId: DEVICE_ID,
    });

    const linkTarget = accounts[0] ?? organizations[0];
    if (!linkTarget) {
      dispatchEvents([noteEvent]);
      return;
    }

    const linkEntityType = accounts[0] ? "account" : "organization";
    const linkEntityId = linkTarget.id;
    const linkId = nextId("noteLink");
    const linkEvent = buildEvent({
      type: "note.linked",
      entityId: linkId,
      payload: {
        id: linkId,
        noteId: id,
        entityType: linkEntityType,
        entityId: linkEntityId,
      },
      deviceId: DEVICE_ID,
    });

    dispatchEvents([noteEvent, linkEvent]);
  };

  const addInteraction = () => {
    const id = nextId("interaction");
    dispatchEvents([
      buildEvent({
        type: "interaction.logged",
        entityId: id,
        payload: {
          id,
          type: "interaction.type.call",
          occurredAt: new Date().toISOString(),
          summary: "Quick check-in call.",
        },
        deviceId: DEVICE_ID,
      }),
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>CRM Orbit</Text>
          <Text style={styles.subtitle}>Offline-first scaffolding</Text>
          {isProcessing ? (
            <Text style={styles.processing}>Processing events...</Text>
          ) : null}
          {lastEventType ? (
            <Text style={styles.meta}>Last event: {lastEventType}</Text>
          ) : null}
          {lastError ? <Text style={styles.error}>{lastError}</Text> : null}
        </View>

        <Section title="Organizations">
          <ActionButton label="Add organization" onPress={addOrganization} />
          {organizations.length === 0 ? (
            <Text style={styles.empty}>No organizations yet.</Text>
          ) : (
            organizations.map((org) => (
              <Text key={org.id} style={styles.item}>
                {org.name} ({org.status})
              </Text>
            ))
          )}
        </Section>

        <Section title="Accounts">
          <ActionButton
            label="Add account"
            onPress={addAccount}
            disabled={organizations.length === 0}
          />
          {organizations.length === 0 ? (
            <Text style={styles.hint}>Add an organization first.</Text>
          ) : null}
          {accounts.length === 0 ? (
            <Text style={styles.empty}>No accounts yet.</Text>
          ) : (
            accounts.map((account) => (
              <Text key={account.id} style={styles.item}>
                {account.name} (org {account.organizationId})
              </Text>
            ))
          )}
        </Section>

        <Section title="Contacts">
          <ActionButton label="Add contact" onPress={addContact} />
          {contacts.length === 0 ? (
            <Text style={styles.empty}>No contacts yet.</Text>
          ) : (
            contacts.map((contact) => (
              <Text key={contact.id} style={styles.item}>
                {contact.name} ({contact.type})
              </Text>
            ))
          )}
        </Section>

        <Section title="Notes">
          <ActionButton label="Add note" onPress={addNote} />
          {notes.length === 0 ? (
            <Text style={styles.empty}>No notes yet.</Text>
          ) : (
            notes.map((note) => (
              <Text key={note.id} style={styles.item}>
                {note.title}: {note.body}
              </Text>
            ))
          )}
        </Section>

        <Section title="Interactions">
          <ActionButton label="Add interaction" onPress={addInteraction} />
          {interactions.length === 0 ? (
            <Text style={styles.empty}>No interactions yet.</Text>
          ) : (
            interactions.map((interaction) => (
              <Text key={interaction.id} style={styles.item}>
                {interaction.type}: {interaction.summary}
              </Text>
            ))
          )}
        </Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f2ee",
  },
  scroll: {
    padding: 20,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1b1b1b",
  },
  subtitle: {
    fontSize: 14,
    color: "#5b5b5b",
    marginTop: 4,
  },
  processing: {
    marginTop: 8,
    color: "#8b5a2b",
    fontWeight: "600",
  },
  meta: {
    marginTop: 6,
    color: "#4a4a4a",
    fontSize: 12,
  },
  error: {
    marginTop: 8,
    color: "#b00020",
  },
  section: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: "#1f1f1f",
  },
  button: {
    backgroundColor: "#1f5eff",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    backgroundColor: "#9aa7cf",
  },
  buttonLabel: {
    color: "#ffffff",
    fontWeight: "600",
  },
  item: {
    fontSize: 14,
    marginBottom: 6,
    color: "#2a2a2a",
  },
  empty: {
    fontSize: 13,
    color: "#7a7a7a",
    fontStyle: "italic",
  },
  hint: {
    fontSize: 12,
    color: "#8a6f00",
    marginBottom: 8,
  },
});
