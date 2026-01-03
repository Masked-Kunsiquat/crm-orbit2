import { useMemo, useCallback } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import type { EntityLinkType } from "@domains/relations/entityLink";
import type { EntityId } from "@domains/shared/types";
import { t } from "@i18n/index";

import { useDeviceId, useTheme } from "../hooks";
import { useEntityLinkActions } from "../hooks/useEntityLinkActions";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import { useAllNotes } from "../store/store";
import { ConfirmDialog } from "./ConfirmDialog";
import { ListEmptyState } from "./ListEmptyState";

type LinkEntityType = Exclude<EntityLinkType, "note" | "interaction">;

type LinkNoteModalProps = {
  visible: boolean;
  onClose: () => void;
  entityType: LinkEntityType;
  entityId: EntityId;
  existingNoteIds: EntityId[];
};

export const LinkNoteModal = ({
  visible,
  onClose,
  entityType,
  entityId,
  existingNoteIds,
}: LinkNoteModalProps) => {
  const { colors } = useTheme();
  const deviceId = useDeviceId();
  const { linkNote } = useEntityLinkActions(deviceId);
  const notes = useAllNotes();
  const { dialogProps, showAlert } = useConfirmDialog();

  const existingIds = useMemo(
    () => new Set(existingNoteIds),
    [existingNoteIds],
  );

  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => {
      const aTime = Date.parse(a.createdAt);
      const bTime = Date.parse(b.createdAt);
      return bTime - aTime;
    });
  }, [notes]);

  const handleLink = useCallback(
    (noteId: EntityId) => {
      if (existingIds.has(noteId)) {
        return;
      }
      const result = linkNote(noteId, entityType, entityId);
      if (result.success) {
        onClose();
        return;
      }
      showAlert(
        t("common.error"),
        result.error ?? t("notes.linkError"),
        t("common.ok"),
      );
    },
    [entityId, entityType, existingIds, linkNote, onClose, showAlert],
  );

  return (
    <>
      <Modal
        transparent
        animationType="slide"
        visible={visible}
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View
            style={[
              styles.modal,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t("notes.linkTitle")}
            </Text>
            {sortedNotes.length === 0 ? (
              <ListEmptyState
                title={t("notes.emptyTitle")}
                hint={t("notes.emptyHint")}
                style={styles.emptyState}
              />
            ) : (
              <FlatList
                data={sortedNotes}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const isLinked = existingIds.has(item.id);
                  return (
                    <TouchableOpacity
                      style={[
                        styles.item,
                        {
                          borderColor: colors.borderLight,
                          backgroundColor: colors.surfaceElevated,
                        },
                        isLinked && styles.itemDisabled,
                      ]}
                      onPress={() => handleLink(item.id)}
                      disabled={isLinked}
                    >
                      <Text
                        style={[
                          styles.itemTitle,
                          {
                            color: isLinked
                              ? colors.textMuted
                              : colors.textPrimary,
                          },
                        ]}
                      >
                        {item.title}
                      </Text>
                      <Text
                        style={[
                          styles.itemBody,
                          {
                            color: isLinked
                              ? colors.textMuted
                              : colors.textSecondary,
                          },
                        ]}
                        numberOfLines={2}
                      >
                        {item.body}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={styles.listContent}
              />
            )}
            <TouchableOpacity
              style={[
                styles.cancelButton,
                { backgroundColor: colors.surfaceElevated },
              ]}
              onPress={onClose}
            >
              <Text style={[styles.cancelText, { color: colors.textPrimary }]}>
                {t("common.cancel")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {dialogProps ? <ConfirmDialog {...dialogProps} /> : null}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    maxHeight: "85%",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 8,
  },
  item: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  itemDisabled: {
    opacity: 0.5,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 6,
  },
  itemBody: {
    fontSize: 13,
  },
  emptyState: {
    paddingVertical: 24,
  },
  cancelButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
