import { useMemo } from "react";

import type { NotesStackScreenProps } from "../../navigation/types";
import { useAllNotes } from "../../store/store";
import type { Note } from "../../../domains/note";
import { t } from "@i18n/index";
import { ListRow, ListScreenLayout } from "../../components";

type Props = NotesStackScreenProps<"NotesList">;

export const NotesListScreen = ({ navigation }: Props) => {
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
        <ListRow
          onPress={() => handlePress(item)}
          title={item.title}
          description={item.body}
          descriptionNumberOfLines={3}
          titleSpacing={8}
        />
      )}
      emptyTitle={t("notes.emptyTitle")}
      emptyHint={t("notes.emptyHint")}
      onAdd={handleCreate}
    />
  );
};
