import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
} from "react-native";
import { useLayoutEffect, useCallback } from "react";

import type { NotesStackScreenProps } from "../../navigation/types";
import { useNote, useEntitiesForNote } from "../../store/store";
import { useNoteActions } from "../../hooks/useNoteActions";
import { t } from "@i18n/index";

const DEVICE_ID = "device-local";

type Props = NotesStackScreenProps<"NoteDetail">;

export const NoteDetailScreen = ({ route, navigation }: Props) => {
  const { noteId } = route.params;
  const note = useNote(noteId);
  const linkedEntities = useEntitiesForNote(noteId);
  const { deleteNote, unlinkNote } = useNoteActions(DEVICE_ID);

  const handleEdit = useCallback(() => {
    if (!note?.id) return;
    navigation.navigate("NoteForm", { noteId: note.id });
  }, [note?.id, navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity style={styles.headerButton} onPress={handleEdit}>
          <Text style={styles.headerButtonText}>{t("common.edit")}</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleEdit]);

  if (!note) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{t("notes.notFound")}</Text>
      </View>
    );
  }

  const handleUnlink = (linkId: string, name: string) => {
    Alert.alert(
      t("notes.unlinkTitle"),
      t("notes.unlinkConfirmation").replace("{name}", name),
      [
        { text: t("notes.unlinkCancel"), style: "cancel" },
        {
          text: t("notes.unlinkAction"),
          style: "destructive",
          onPress: () => {
            unlinkNote(linkId);
          },
        },
      ],
    );
  };

  const handleDelete = () => {
    Alert.alert(t("notes.deleteTitle"), t("notes.deleteConfirmation"), [
      {
        text: t("common.cancel"),
        style: "cancel",
      },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => {
          const result = deleteNote(note.id);
          if (result.success) {
            navigation.goBack();
          } else {
            Alert.alert(
              t("common.error"),
              result.error ?? t("notes.deleteError"),
            );
          }
        },
      },
    ]);
  };

  const navigateToEntity = (
    entityType: (typeof linkedEntities)[number]["entityType"],
    entityId: string,
  ) => {
    switch (entityType) {
      case "organization":
        navigation.navigate("OrganizationDetail", {
          organizationId: entityId,
        });
        break;
      case "account":
        navigation.navigate("AccountDetail", {
          accountId: entityId,
        });
        break;
      case "contact":
        navigation.navigate("ContactDetail", {
          contactId: entityId,
        });
        break;
      // Cannot navigate to a note from itself or an interaction yet
      case "note":
      case "interaction":
      default:
        break;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.title}>{note.title}</Text>
        <Text style={styles.date}>
          {new Date(note.createdAt).toLocaleString()}
        </Text>
        <Text style={styles.body}>{note.body}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("notes.linkedToSection")}</Text>
        {linkedEntities.length === 0 ? (
          <Text style={styles.emptyText}>{t("notes.noLinkedEntities")}</Text>
        ) : (
          linkedEntities.map((entity) => {
            const displayName = entity.name ?? t("common.unknownEntity");
            return (
              <View key={entity.linkId} style={styles.linkedItem}>
                <Pressable
                  style={styles.linkedItemPressable}
                  onPress={() =>
                    navigateToEntity(entity.entityType, entity.entityId)
                  }
                >
                  <Text style={styles.linkedItemType}>{entity.entityType}</Text>
                  <Text style={styles.linkedItemName}>{displayName}</Text>
                </Pressable>
                <TouchableOpacity
                  style={styles.unlinkButton}
                  onPress={() => handleUnlink(entity.linkId, displayName)}
                >
                  <Text style={styles.unlinkButtonText}>
                    {t("notes.unlinkButton")}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteButtonText}>{t("notes.deleteButton")}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f2ee",
  },
  section: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 12,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerButtonText: {
    color: "#1f5eff",
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1b1b1b",
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: "#666",
    marginBottom: 16,
  },
  body: {
    fontSize: 16,
    color: "#1b1b1b",
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1b1b1b",
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },
  linkedItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  linkedItemPressable: {
    flex: 1,
  },
  linkedItemType: {
    fontSize: 12,
    color: "#666",
    textTransform: "capitalize",
  },
  linkedItemName: {
    fontSize: 15,
    color: "#1b1b1b",
  },
  unlinkButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#ffebee",
  },
  unlinkButtonText: {
    fontSize: 12,
    color: "#b00020",
    fontWeight: "600",
  },
  errorText: {
    fontSize: 16,
    color: "#b00020",
    textAlign: "center",
    marginTop: 32,
  },
  deleteButton: {
    backgroundColor: "#b00020",
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
