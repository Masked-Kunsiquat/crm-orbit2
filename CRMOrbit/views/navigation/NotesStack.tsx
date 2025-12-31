import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { NotesStackParamList } from "./types";
import { NotesListScreen } from "../screens/notes/NotesListScreen";
import { NoteDetailScreen } from "../screens/notes/NoteDetailScreen";
import { NoteFormScreen } from "../screens/notes/NoteFormScreen";
import { stackScreenOptions } from "./stackOptions";

const Stack = createNativeStackNavigator<NotesStackParamList>();

export const NotesStack = () => {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="NotesList"
        component={NotesListScreen}
        options={{ title: "Notes" }}
      />
      <Stack.Screen
        name="NoteDetail"
        component={NoteDetailScreen}
        options={{ title: "Note Details" }}
      />
      <Stack.Screen
        name="NoteForm"
        component={NoteFormScreen}
        options={({ route }) => ({
          title: route.params?.noteId ? "Edit Note" : "New Note",
        })}
      />
    </Stack.Navigator>
  );
};
