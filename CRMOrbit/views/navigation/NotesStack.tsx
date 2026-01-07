import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { NotesStackParamList } from "./types";
import { NotesAndCodesLandingScreen } from "../screens/notes/NotesAndCodesLandingScreen";
import { NotesListScreen } from "../screens/notes/NotesListScreen";
import { NoteDetailScreen } from "../screens/notes/NoteDetailScreen";
import { NoteFormScreen } from "../screens/notes/NoteFormScreen";
import {
  CodesListScreen,
  CodeDetailScreen,
  CodeFormScreen,
} from "../screens/codes";
import { getStackScreenOptions } from "./stackOptions";
import { t } from "@i18n/index";
import { useTheme } from "../hooks";

const Stack = createNativeStackNavigator<NotesStackParamList>();

export const NotesStack = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator screenOptions={getStackScreenOptions(colors)}>
      <Stack.Screen
        name="NotesAndCodesLanding"
        component={NotesAndCodesLandingScreen}
        options={{ title: t("screens.notesAndCodes") }}
      />
      <Stack.Screen
        name="CodesList"
        component={CodesListScreen}
        options={{ title: t("codes.listTitle") }}
      />
      <Stack.Screen
        name="CodeDetail"
        component={CodeDetailScreen}
        options={{ title: t("screens.codeDetails") }}
      />
      <Stack.Screen
        name="CodeForm"
        component={CodeFormScreen}
        options={({ route }) => ({
          title: route.params?.codeId
            ? t("screens.editCode")
            : t("screens.newCode"),
        })}
      />
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
