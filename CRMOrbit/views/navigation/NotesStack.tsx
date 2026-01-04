import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { NotesStackParamList } from "./types";
import { NotesAndInteractionsLandingScreen } from "../screens/notes/NotesAndInteractionsLandingScreen";
import { NotesListScreen } from "../screens/notes/NotesListScreen";
import { NoteDetailScreen } from "../screens/notes/NoteDetailScreen";
import { NoteFormScreen } from "../screens/notes/NoteFormScreen";
import {
  InteractionsListScreen,
  InteractionDetailScreen,
  InteractionFormScreen,
} from "../screens/interactions";
import { getStackScreenOptions } from "./stackOptions";
import { t } from "@i18n/index";
import { useTheme } from "../hooks";

const Stack = createNativeStackNavigator<NotesStackParamList>();

export const NotesStack = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator screenOptions={getStackScreenOptions(colors)}>
      <Stack.Screen
        name="NotesAndInteractionsLanding"
        component={NotesAndInteractionsLandingScreen}
        options={{ title: "Notes & Interactions" }}
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
      <Stack.Screen
        name="InteractionsList"
        component={InteractionsListScreen}
        options={{ title: t("interactions.title") }}
      />
      <Stack.Screen
        name="InteractionDetail"
        component={InteractionDetailScreen}
        options={{ title: t("screens.interactionDetails") }}
      />
      <Stack.Screen
        name="InteractionForm"
        component={InteractionFormScreen}
        options={({ route }) => ({
          title: route.params?.interactionId
            ? t("screens.editInteraction")
            : t("screens.newInteraction"),
        })}
      />
    </Stack.Navigator>
  );
};
