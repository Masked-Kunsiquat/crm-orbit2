import { useState, useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";

import type { NotesStackScreenProps } from "../../navigation/types";
import { useNote } from "../../store/store";
import { useNoteActions } from "../../hooks";
import { t } from "@i18n/index";

const DEVICE_ID = "device-local";

type Props = NotesStackScreenProps<"NoteForm">;

export const NoteFormScreen = ({ route, navigation }: Props) => {
  const { noteId, entityToLink } = route.params ?? {};
  const note = useNote(noteId ?? "");
  const { createNote, updateNote, linkNote, deleteNote } =
    useNoteActions(DEVICE_ID);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setBody(note.body);
    }
  }, [note]);

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert(t("common.error"), t("notes.validation.titleRequired"));
      return;
    }

    if (noteId) {
      const result = updateNote(noteId, title.trim(), body.trim());
      if (result.success) {
        navigation.goBack();
      } else {
        Alert.alert(t("common.error"), result.error || t("notes.updateError"));
      }
    } else {
      const result = createNote(title.trim(), body.trim());
      if (result.success) {
        if (entityToLink) {
          const linkResult = linkNote(
            result.id,
            entityToLink.entityType,
            entityToLink.entityId,
          );
          if (!linkResult.success) {
            Alert.alert(
              t("notes.linkFailureTitle"),
              t("notes.linkFailureMessage"),
              [
                {
                  text: t("notes.linkFailureDelete"),
                  style: "destructive",
                  onPress: () => {
                    deleteNote(result.id);
                    navigation.goBack();
                  },
                },
                {
                  text: t("notes.linkFailureKeep"),
                  onPress: () => {
                    navigation.goBack();
                  },
                },
              ],
            );
            return;
          }
        }
        navigation.goBack();
      } else {
        Alert.alert(t("common.error"), result.error || t("notes.createError"));
      }
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>{t("notes.form.titleLabel")}</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder={t("notes.form.titlePlaceholder")}
            autoFocus
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t("notes.form.bodyLabel")}</Text>
          <TextInput
            style={[styles.input, styles.bodyInput]}
            value={body}
            onChangeText={setBody}
            placeholder={t("notes.form.bodyPlaceholder")}
            multiline
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>
            {noteId
              ? t("notes.form.updateButton")
              : t("notes.form.createButton")}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f2ee",
  },
  form: {
    padding: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1b1b1b",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  bodyInput: {
    height: 200,
  },
  saveButton: {
    backgroundColor: "#1f5eff",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
