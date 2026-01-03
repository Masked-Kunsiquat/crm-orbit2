import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
} from "react-native";
import { useLayoutEffect, useCallback } from "react";

import type { NotesStackScreenProps } from "../../navigation/types";
import {
  useNote,
  useEntitiesForNote,
  useTimeline,
  useDoc,
} from "../../store/store";
import { useNoteActions } from "../../hooks/useNoteActions";
import {
  DetailScreenLayout,
  Section,
  PrimaryActionButton,
  DangerActionButton,
  ConfirmDialog,
  TimelineSection,
} from "../../components";
import { useTheme } from "../../hooks";
import { t } from "@i18n/index";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";

const DEVICE_ID = "device-local";

type Props = NotesStackScreenProps<"NoteDetail">;

export const NoteDetailScreen = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const { noteId } = route.params;
  const note = useNote(noteId);
  const linkedEntities = useEntitiesForNote(noteId);
  const timeline = useTimeline("note", noteId);
  const doc = useDoc();
  const { deleteNote, unlinkNote } = useNoteActions(DEVICE_ID);
  const { dialogProps, showDialog, showAlert } = useConfirmDialog();

  const handleEdit = useCallback(() => {
    if (!note?.id) return;
    navigation.navigate("NoteForm", { noteId: note.id });
  }, [note?.id, navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <PrimaryActionButton
          label={t("common.edit")}
          onPress={handleEdit}
          size="compact"
          tone="link"
        />
      ),
    });
  }, [navigation, handleEdit, colors]);

  if (!note) {
    return (
      <DetailScreenLayout>
        <Text style={[styles.errorText, { color: colors.error }]}>
          {t("notes.notFound")}
        </Text>
      </DetailScreenLayout>
    );
  }

  const handleUnlink = (linkId: string, name: string) => {
    showDialog({
      title: t("notes.unlinkTitle"),
      message: t("notes.unlinkConfirmation").replace("{name}", name),
      confirmLabel: t("notes.unlinkAction"),
      confirmVariant: "danger",
      cancelLabel: t("notes.unlinkCancel"),
      onConfirm: () => {
        unlinkNote(linkId);
      },
    });
  };

  const handleDelete = () => {
    showDialog({
      title: t("notes.deleteTitle"),
      message: t("notes.deleteConfirmation"),
      confirmLabel: t("common.delete"),
      confirmVariant: "danger",
      cancelLabel: t("common.cancel"),
      onConfirm: () => {
        const result = deleteNote(note.id);
        if (result.success) {
          navigation.goBack();
        } else {
          showAlert(
            t("common.error"),
            result.error ?? t("notes.deleteError"),
            t("common.ok"),
          );
        }
      },
    });
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
    <DetailScreenLayout>
      <Section>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {note.title}
        </Text>
        <Text style={[styles.date, { color: colors.textSecondary }]}>
          {new Date(note.createdAt).toLocaleString()}
        </Text>
        <Text style={[styles.body, { color: colors.textPrimary }]}>
          {note.body}
        </Text>
      </Section>

      <Section>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t("notes.linkedToSection")}
        </Text>
        {linkedEntities.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t("notes.noLinkedEntities")}
          </Text>
        ) : (
          linkedEntities.map((entity) => {
            const displayName = entity.name ?? t("common.unknownEntity");
            return (
              <View
                key={entity.linkId}
                style={[
                  styles.linkedItem,
                  { borderTopColor: colors.borderLight },
                ]}
              >
                <Pressable
                  style={styles.linkedItemPressable}
                  onPress={() =>
                    navigateToEntity(entity.entityType, entity.entityId)
                  }
                >
                  <Text
                    style={[
                      styles.linkedItemType,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {entity.entityType}
                  </Text>
                  <Text
                    style={[
                      styles.linkedItemName,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {displayName}
                  </Text>
                </Pressable>
                <TouchableOpacity
                  style={[
                    styles.unlinkButton,
                    { backgroundColor: colors.errorBg },
                  ]}
                  onPress={() => handleUnlink(entity.linkId, displayName)}
                >
                  <Text
                    style={[styles.unlinkButtonText, { color: colors.error }]}
                  >
                    {t("notes.unlinkButton")}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </Section>

      <TimelineSection timeline={timeline} doc={doc} />

      <DangerActionButton
        label={t("notes.deleteButton")}
        onPress={handleDelete}
        size="block"
      />

      {dialogProps ? <ConfirmDialog {...dialogProps} /> : null}
    </DetailScreenLayout>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    marginBottom: 16,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  linkedItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  linkedItemPressable: {
    flex: 1,
  },
  linkedItemType: {
    fontSize: 12,
    textTransform: "capitalize",
  },
  linkedItemName: {
    fontSize: 15,
  },
  unlinkButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  unlinkButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 32,
  },
});
