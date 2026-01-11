import { useMemo, useCallback } from "react";
import { Text } from "react-native";

import type { EntityLinkType } from "@domains/relations/entityLink";
import type { EntityId } from "@domains/shared/types";
import type { Note } from "@domains/note";
import { t } from "@i18n/index";

import { useDeviceId, useTheme } from "../hooks";
import { useEntityLinkActions } from "../hooks/useEntityLinkActions";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import { useAllNotes } from "../store/store";
import { BaseLinkModal } from "./BaseLinkModal";
import { linkModalItemStyles } from "./linkModalItemStyles";

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

  const handleItemPress = useCallback(
    (note: Note) => {
      if (existingIds.has(note.id)) {
        return;
      }
      const result = linkNote(note.id, entityType, entityId);
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

  const renderItem = useCallback(
    (
      note: Note,
      isLinked: boolean,
      colors: ReturnType<typeof useTheme>["colors"],
    ) => (
      <>
        <Text
          style={[
            linkModalItemStyles.itemTitle,
            {
              color: isLinked ? colors.textMuted : colors.textPrimary,
            },
          ]}
        >
          {note.title}
        </Text>
        <Text
          style={[
            linkModalItemStyles.itemBody,
            {
              color: isLinked ? colors.textMuted : colors.textSecondary,
            },
          ]}
          numberOfLines={2}
        >
          {note.body}
        </Text>
      </>
    ),
    [],
  );

  return (
    <BaseLinkModal
      visible={visible}
      onClose={onClose}
      title={t("notes.linkTitle")}
      items={sortedNotes}
      existingIds={existingIds}
      emptyTitle={t("notes.emptyTitle")}
      emptyHint={t("notes.emptyHint")}
      keyExtractor={(note) => note.id}
      renderItem={renderItem}
      onItemPress={handleItemPress}
      dialogProps={dialogProps}
    />
  );
};
