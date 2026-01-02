import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { NotesStackParamList } from "./types";
import { NotesListScreen } from "../screens/notes/NotesListScreen";
import { NoteDetailScreen } from "../screens/notes/NoteDetailScreen";
import { NoteFormScreen } from "../screens/notes/NoteFormScreen";
import { getStackScreenOptions } from "./stackOptions";
import { t } from "@i18n/index";
import { useTheme } from "../hooks";

const Stack = createNativeStackNavigator<NotesStackParamList>();

export const NotesStack = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator screenOptions={getStackScreenOptions(colors)}>
      <Stack.Screen
        name="NotesList"
        component={NotesListScreen}
        options={{ title: t("notes.listTitle") }}
      />
      <Stack.Screen
        name="NoteDetail"
        component={NoteDetailScreen}
        options={{ title: t("notes.detailTitle") }}
      />
      <Stack.Screen
        name="NoteForm"
        component={NoteFormScreen}
        options={({ route }) => ({
          title: route.params?.noteId
            ? t("screens.editNote")
            : t("screens.newNote"),
        })}
      />
    </Stack.Navigator>
  );
};
