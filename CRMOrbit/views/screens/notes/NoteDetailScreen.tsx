import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useMemo, useState } from "react";

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
  LinkEntityToNoteModal,
} from "../../components";
import { useDeviceId, useTheme } from "../../hooks";
import { t } from "@i18n/index";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";

type Props = NotesStackScreenProps<"NoteDetail">;

export const NoteDetailScreen = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const { noteId } = route.params;
  const note = useNote(noteId);
  const linkedEntities = useEntitiesForNote(noteId);
  const timeline = useTimeline("note", noteId);
  const doc = useDoc();
  const deviceId = useDeviceId();
  const { deleteNote, unlinkNote } = useNoteActions(deviceId);
  const { dialogProps, showDialog, showAlert } = useConfirmDialog();
  const [showLinkModal, setShowLinkModal] = useState(false);

  const existingEntityIds = useMemo(
    () => new Set(linkedEntities.map((entity) => entity.entityId)),
    [linkedEntities],
  );

  const handleEdit = () => {
    if (!note?.id) return;
    navigation.navigate("NoteForm", { noteId: note.id });
  };

  if (!note) {
    return (
      <DetailScreenLayout>
        <Text style={[styles.errorText, { color: colors.error }]}>
          {t("notes.notFound")}
        </Text>
      </DetailScreenLayout>
    );
  }

  const handleUnlink = (
    linkId: string,
    name: string,
    entityType: (typeof linkedEntities)[number]["entityType"],
    entityId: string,
  ) => {
    showDialog({
      title: t("notes.unlinkTitle"),
      message: t("notes.unlinkConfirmation").replace("{name}", name),
      confirmLabel: t("notes.unlinkAction"),
      confirmVariant: "danger",
      cancelLabel: t("notes.unlinkCancel"),
      onConfirm: () => {
        unlinkNote(linkId, {
          noteId,
          entityType,
          entityId,
        });
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
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {note.title}
            </Text>
            <Text style={[styles.date, { color: colors.textSecondary }]}>
              {new Date(note.createdAt).toLocaleString()}
            </Text>
          </View>
          <PrimaryActionButton
            label={t("common.edit")}
            onPress={handleEdit}
            size="compact"
          />
        </View>
        <Text style={[styles.body, { color: colors.textPrimary }]}>
          {note.body}
        </Text>
      </Section>

      <Section>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t("notes.linkedToSection")}
          </Text>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.surfaceElevated }]}
            onPress={() => setShowLinkModal(true)}
            accessibilityLabel={t("notes.linkEntityButton")}
          >
            <MaterialCommunityIcons
              name="link-variant-plus"
              size={18}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
        </View>
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
                    styles.iconButton,
                    { backgroundColor: colors.errorBg },
                  ]}
                  onPress={() =>
                    handleUnlink(
                      entity.linkId,
                      displayName,
                      entity.entityType,
                      entity.entityId,
                    )
                  }
                  accessibilityLabel={t("notes.unlinkButton")}
                >
                  <MaterialCommunityIcons
                    name="link-variant-minus"
                    size={18}
                    color={colors.error}
                  />
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

      <LinkEntityToNoteModal
        visible={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        noteId={noteId}
        existingEntityIds={existingEntityIds}
      />

      {dialogProps ? <ConfirmDialog {...dialogProps} /> : null}
    </DetailScreenLayout>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
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
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 32,
  },
});
