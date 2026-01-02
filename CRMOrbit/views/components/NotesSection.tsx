import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
} from "react-native";
import type { Note } from "@domains/note";
import { t } from "@i18n/index";
import { useTheme } from "../hooks";
import { Section } from "./Section";

type EntityType = "account" | "organization" | "contact";

interface NotesSectionProps {
  notes: Note[];
  entityId: string;
  entityType: EntityType;
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

export const NotesSection = ({
  notes,
  entityId,
  entityType,
  navigation,
}: NotesSectionProps) => {
  const { colors } = useTheme();

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
    <Section>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t("notes.title")} ({notes.length})
        </Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.accent }]}
          onPress={() =>
            navigation.navigate("NoteForm", {
              entityToLink: { entityId, entityType },
            })
          }
        >
          <Text style={[styles.addButtonText, { color: colors.onAccent }]}>
            {t("notes.addButton")}
          </Text>
        </TouchableOpacity>
      </View>
      {notes.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {t(getEmptyMessageKey())}
        </Text>
      ) : (
        notes.map((note) => (
          <Pressable
            key={note.id}
            style={[
              styles.noteCard,
              { backgroundColor: colors.surfaceElevated },
            ]}
            onPress={() => {
              navigation.navigate("NoteDetail", { noteId: note.id });
            }}
          >
            <View style={styles.noteCardContent}>
              <Text style={[styles.noteTitle, { color: colors.textPrimary }]}>
                {note.title}
              </Text>
              <Text
                style={[styles.noteBody, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {note.body}
              </Text>
            </View>
            <Text style={[styles.chevron, { color: colors.chevron }]}>›</Text>
          </Pressable>
        ))
      )}
    </Section>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  noteCard: {
    padding: 12,
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
    marginBottom: 4,
  },
  noteBody: {
    fontSize: 14,
  },
  chevron: {
    fontSize: 20,
    marginLeft: 8,
  },
});
