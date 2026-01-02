import { StyleSheet, Text, View } from "react-native";
import { useMemo } from "react";

import type { NotesStackScreenProps } from "../../navigation/types";
import { useAllNotes } from "../../store/store";
import type { Note } from "../../../domains/note";
import { t } from "@i18n/index";
import { ListCard, ListScreenLayout } from "../../components";
import { useTheme } from "../../hooks";

type Props = NotesStackScreenProps<"NotesList">;

export const NotesListScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const allNotes = useAllNotes();

  const sortedNotes = useMemo(() => {
    return [...allNotes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [allNotes]);

  const handlePress = (note: Note) => {
    navigation.navigate("NoteDetail", { noteId: note.id });
  };

  const handleCreate = () => {
    navigation.navigate("NoteForm", {});
  };

  return (
    <ListScreenLayout
      data={sortedNotes}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ListCard onPress={() => handlePress(item)} variant="outlined">
          <View style={styles.cardHeader}>
            <Text style={[styles.name, { color: colors.textPrimary }]}>
              {item.title}
            </Text>
          </View>
          <Text
            style={[styles.body, { color: colors.textSecondary }]}
            numberOfLines={3}
          >
            {item.body}
          </Text>
        </ListCard>
      )}
      emptyTitle={t("notes.emptyTitle")}
      emptyHint={t("notes.emptyHint")}
      onAdd={handleCreate}
    />
  );
};

const styles = StyleSheet.create({
  cardHeader: {
    marginBottom: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
  },
  body: {
    fontSize: 14,
  },
});
