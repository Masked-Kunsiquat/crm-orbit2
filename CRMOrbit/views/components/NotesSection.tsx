import { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
} from "react-native";
import type { Note } from "@domains/note";
import type { EntityId } from "@domains/shared/types";
import { t } from "@i18n/index";
import { useDeviceId, useTheme } from "../hooks";
import { useEntityLinkActions } from "../hooks/useEntityLinkActions";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import { useDoc } from "../store/store";
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

export const NotesSection = ({
  notes,
  entityId,
  entityType,
  navigation,
}: NotesSectionProps) => {
  const { colors } = useTheme();
  const deviceId = useDeviceId();
  const doc = useDoc();
  const { unlinkNote } = useEntityLinkActions(deviceId);
  const { dialogProps, showDialog } = useConfirmDialog();
  const [showLinkModal, setShowLinkModal] = useState(false);

  const existingNoteIds = useMemo(() => notes.map((note) => note.id), [notes]);
  const linkIdsByNoteId = useMemo(() => {
    const entries = Object.entries(doc.relations.entityLinks);
    const map = new Map<EntityId, EntityId>();
    for (const [linkId, link] of entries) {
      if (
        link.linkType === "note" &&
        link.noteId &&
        link.entityType === entityType &&
        link.entityId === entityId
      ) {
        map.set(link.noteId, linkId);
      }
    }
    return map;
  }, [doc.relations.entityLinks, entityId, entityType]);

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
    const linkId = linkIdsByNoteId.get(noteId);
    if (!linkId) {
      return;
    }
    showDialog({
      title: t("notes.unlinkTitle"),
      message: t("notes.unlinkConfirmation").replace("{name}", title),
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

  return (
    <Section>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t("notes.title")} ({notes.length})
        </Text>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.accent }]}
            onPress={() =>
              navigation.navigate("NoteForm", {
                entityToLink: { entityId, entityType },
              })
            }
          >
            <Text style={[styles.addButtonText, { color: colors.onAccent }]}>
              {t("notes.addButton")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.linkButton,
              { backgroundColor: colors.surfaceElevated },
            ]}
            onPress={() => setShowLinkModal(true)}
          >
            <Text
              style={[styles.linkButtonText, { color: colors.textPrimary }]}
            >
              {t("notes.linkExisting")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {notes.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {t(getEmptyMessageKey())}
        </Text>
      ) : (
        notes.map((note) => (
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
            >
              <Text style={[styles.unlinkButtonText, { color: colors.error }]}>
                {t("notes.unlinkButton")}
              </Text>
            </TouchableOpacity>
          </View>
        ))
      )}
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
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  linkButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  linkButtonText: {
    fontSize: 13,
    fontWeight: "600",
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
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  unlinkButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
