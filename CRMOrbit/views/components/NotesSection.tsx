import { StyleSheet, Text, TouchableOpacity, View, Pressable } from "react-native";
import type { Note } from "@domains/note";
import { t } from "@i18n/index";

type EntityType = "account" | "organization" | "contact";

interface NotesSectionProps {
  notes: Note[];
  entityId: string;
  entityType: EntityType;
  navigation: {
    navigate: (screen: string, params?: any) => void;
  };
}

export const NotesSection = ({
  notes,
  entityId,
  entityType,
  navigation,
}: NotesSectionProps) => {
  const getEmptyMessageKey = (): string => {
    switch (entityType) {
      case "account":
        return "notes.emptyAccountNotes";
      case "organization":
        return "notes.emptyOrganizationNotes";
      case "contact":
        return "notes.emptyContactNotes";
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {t("notes.title")} ({notes.length})
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() =>
            navigation.navigate("NoteForm", {
              entityToLink: { entityId, entityType },
            })
          }
        >
          <Text style={styles.addButtonText}>{t("notes.addButton")}</Text>
        </TouchableOpacity>
      </View>
      {notes.length === 0 ? (
        <Text style={styles.emptyText}>{t(getEmptyMessageKey())}</Text>
      ) : (
        notes.map((note) => (
          <Pressable
            key={note.id}
            style={styles.noteCard}
            onPress={() => {
              navigation.navigate("NoteDetail", { noteId: note.id });
            }}
          >
            <View style={styles.noteCardContent}>
              <Text style={styles.noteTitle}>{note.title}</Text>
              <Text style={styles.noteBody} numberOfLines={2}>
                {note.body}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1b1b1b",
  },
  addButton: {
    backgroundColor: "#e3f2fd",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: "#1f5eff",
    fontSize: 13,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },
  noteCard: {
    padding: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 6,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  noteCardContent: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1b1b1b",
    marginBottom: 4,
  },
  noteBody: {
    fontSize: 14,
    color: "#666",
  },
  chevron: {
    fontSize: 20,
    color: "#cccccc",
    marginLeft: 8,
  },
});
