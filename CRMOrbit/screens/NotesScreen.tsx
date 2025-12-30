import { StyleSheet, Text } from "react-native";

import { ActionButton, Section } from "../components";
import { useNoteActions } from "../crm-core/hooks";
import { useAccounts, useOrganizations } from "../crm-core/views/store";
import { useCrmStore } from "../crm-core/views/store";

const DEVICE_ID = "device-local";

export const NotesScreen = () => {
  const organizations = useOrganizations();
  const accounts = useAccounts();
  const doc = useCrmStore((state) => state.doc);
  const notes = Object.values(doc.notes);
  const { createNote, linkNote } = useNoteActions(DEVICE_ID);

  const handleAddNote = () => {
    // Use timestamp-based identifier (locale-neutral)
    // In production, this would prompt the user for title and body
    const timestamp = Date.now();
    const noteTitle = `note-${timestamp}`;
    const noteBody = `note-body-${timestamp}`;

    const result = createNote(noteTitle, noteBody);

    // Link to first available entity using the returned ID
    if (result.success) {
      const linkTarget = accounts[0] ?? organizations[0];
      if (linkTarget) {
        const linkEntityType = accounts[0] ? "account" : "organization";
        const linkEntityId = linkTarget.id;

        // Use the returned note ID immediately - no race condition
        linkNote(result.id, linkEntityType, linkEntityId);
      }
    }
  };

  return (
    <Section title="Notes">
      <ActionButton label="Add note" onPress={handleAddNote} />
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
  );
};

const styles = StyleSheet.create({
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
});
