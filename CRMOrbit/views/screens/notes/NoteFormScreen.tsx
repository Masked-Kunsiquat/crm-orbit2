import { useState, useEffect } from "react";
import {
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
import { DetailScreenLayout, Section } from "../../components";
import { useTheme } from "../../hooks";
import { t } from "@i18n/index";
import { nextId } from "@domains/shared/idGenerator";

const DEVICE_ID = "device-local";

type Props = NotesStackScreenProps<"NoteForm">;

export const NoteFormScreen = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
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
      // Pre-generate the note id so linking can reference it without relying on return values.
      const newNoteId = nextId("note");
      const result = createNote(title.trim(), body.trim(), newNoteId);
      if (result.success) {
        if (entityToLink) {
          const linkResult = linkNote(
            newNoteId,
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
                    deleteNote(newNoteId);
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
    <DetailScreenLayout>
      <Section>
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            {t("notes.form.titleLabel")}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.textPrimary,
              },
            ]}
            value={title}
            onChangeText={setTitle}
            placeholder={t("notes.form.titlePlaceholder")}
            placeholderTextColor={colors.textMuted}
            autoFocus
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            {t("notes.form.bodyLabel")}
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.bodyInput,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.textPrimary,
              },
            ]}
            value={body}
            onChangeText={setBody}
            placeholder={t("notes.form.bodyPlaceholder")}
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.accent }]}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>
            {noteId
              ? t("notes.form.updateButton")
              : t("notes.form.createButton")}
          </Text>
        </TouchableOpacity>
      </Section>
    </DetailScreenLayout>
  );
};

const styles = StyleSheet.create({
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  bodyInput: {
    height: 200,
  },
  saveButton: {
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
