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
    const noteTitle = `Note ${notes.length + 1}`;
    const noteBody = "Quick update captured in the field.";

    const result = createNote(noteTitle, noteBody);

    // Link to first available entity
    if (result.success) {
      const linkTarget = accounts[0] ?? organizations[0];
      if (linkTarget) {
        const linkEntityType = accounts[0] ? "account" : "organization";
        const linkEntityId = linkTarget.id;

        // Wait a moment for the note to be created, then link
        setTimeout(() => {
          const allNotes = Object.values(useCrmStore.getState().doc.notes);
          const newNote = allNotes[allNotes.length - 1];
          if (newNote) {
            linkNote(newNote.id, linkEntityType, linkEntityId);
          }
        }, 50);
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
