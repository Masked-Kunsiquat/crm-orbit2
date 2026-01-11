import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { Note } from "@domains/note";
import type { EntityId } from "@domains/shared/types";
import { t } from "@i18n/index";
import {
  useDeviceId,
  useTheme,
  useEntityLinkMap,
  useNoteUnlink,
} from "../hooks";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import { ConfirmDialog } from "./ConfirmDialog";
import { LinkNoteModal } from "./LinkNoteModal";
import { Section } from "./Section";

type EntityType = "account" | "organization" | "contact";

interface NotesSectionProps {
  notes: Note[];
  entityId: string;
  entityType: EntityType;
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

const PREVIEW_LIMIT = 3;

export const NotesSection = ({
  notes,
  entityId,
  entityType,
  navigation,
}: NotesSectionProps) => {
  const { colors } = useTheme();
  const deviceId = useDeviceId();
  const { dialogProps, showDialog } = useConfirmDialog();
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);

  const existingNoteIds = useMemo(() => notes.map((note) => note.id), [notes]);
  const linkIdsByNoteId = useEntityLinkMap("note", entityType, entityId);
  const unlinkController = useNoteUnlink({
    entityType,
    entityId,
    linkIdsByNoteId,
    deviceId,
  });

  const getEmptyMessageKey = (): string => {
    switch (entityType) {
      case "account":
        return "notes.emptyAccountNotes";
      case "organization":
        return "notes.emptyOrganizationNotes";
      case "contact":
        return "notes.emptyContactNotes";
    }
  };

  const handleUnlink = (noteId: EntityId, title: string) => {
    if (!unlinkController.canUnlink(noteId)) {
      return;
    }
    showDialog({
      title: t("notes.unlinkTitle"),
      message: unlinkController.getConfirmationMessage(title),
      confirmLabel: t("notes.unlinkAction"),
      confirmVariant: "danger",
      cancelLabel: t("notes.unlinkCancel"),
      onConfirm: () => {
        unlinkController.executeUnlink(noteId);
      },
    });
  };

  const visibleNotes = notes.slice(0, PREVIEW_LIMIT);
  const hasMore = notes.length > PREVIEW_LIMIT;

  return (
    <Section>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t("notes.title")} ({notes.length})
        </Text>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.accent }]}
            onPress={() =>
              navigation.navigate("NoteForm", {
                entityToLink: { entityId, entityType },
              })
            }
            accessibilityLabel={t("notes.addButton")}
          >
            <MaterialCommunityIcons
              name="plus"
              size={18}
              color={colors.onAccent}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.iconButton,
              styles.iconButtonSecondary,
              { backgroundColor: colors.surfaceElevated },
            ]}
            onPress={() => setShowLinkModal(true)}
            accessibilityLabel={t("notes.linkExisting")}
          >
            <MaterialCommunityIcons
              name="link-variant-plus"
              size={18}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
        </View>
      </View>
      {notes.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {t(getEmptyMessageKey())}
        </Text>
      ) : (
        visibleNotes.map((note) => (
          <View
            key={note.id}
            style={[
              styles.noteCard,
              { backgroundColor: colors.surfaceElevated },
            ]}
          >
            <Pressable
              style={styles.noteCardRow}
              onPress={() => {
                navigation.navigate("NoteDetail", { noteId: note.id });
              }}
            >
              <View style={styles.noteCardContent}>
                <Text style={[styles.noteTitle, { color: colors.textPrimary }]}>
                  {note.title}
                </Text>
                <Text
                  style={[styles.noteBody, { color: colors.textSecondary }]}
                  numberOfLines={2}
                >
                  {note.body}
                </Text>
              </View>
              <Text style={[styles.chevron, { color: colors.chevron }]}>›</Text>
            </Pressable>
            <TouchableOpacity
              style={[styles.unlinkButton, { backgroundColor: colors.errorBg }]}
              onPress={() => handleUnlink(note.id, note.title)}
              accessibilityLabel={t("notes.unlinkButton")}
            >
              <MaterialCommunityIcons
                name="link-variant-minus"
                size={18}
                color={colors.error}
              />
            </TouchableOpacity>
          </View>
        ))
      )}
      {hasMore ? (
        <TouchableOpacity
          style={[styles.viewAllButton, { borderColor: colors.border }]}
          onPress={() => setShowAllModal(true)}
        >
          <Text style={[styles.viewAllText, { color: colors.accent }]}>
            {t("common.viewAll")}
          </Text>
        </TouchableOpacity>
      ) : null}
      <Modal
        visible={showAllModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAllModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {t("notes.title")} ({notes.length})
              </Text>
              <TouchableOpacity
                onPress={() => setShowAllModal(false)}
                accessibilityLabel={t("common.cancel")}
              >
                <Text style={[styles.modalClose, { color: colors.accent }]}>
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={notes}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.modalItem,
                    { borderBottomColor: colors.borderLight },
                  ]}
                  onPress={() => {
                    setShowAllModal(false);
                    navigation.navigate("NoteDetail", { noteId: item.id });
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemTitle,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={[
                      styles.modalItemBody,
                      { color: colors.textSecondary },
                    ]}
                    numberOfLines={2}
                  >
                    {item.body}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
      <LinkNoteModal
        visible={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        entityType={entityType}
        entityId={entityId}
        existingNoteIds={existingNoteIds}
      />
      {dialogProps ? <ConfirmDialog {...dialogProps} /> : null}
    </Section>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonSecondary: {
    marginLeft: 8,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  noteCard: {
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  noteCardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  noteCardContent: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  noteBody: {
    fontSize: 14,
  },
  chevron: {
    fontSize: 20,
    marginLeft: 8,
  },
  unlinkButton: {
    marginTop: 8,
    width: 44,
    height: 44,
    borderRadius: 12,
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
  },
  viewAllButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  modalContent: {
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: "70%",
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalClose: {
    fontSize: 13,
    fontWeight: "600",
  },
  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  modalItemBody: {
    fontSize: 14,
  },
});
