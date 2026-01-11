import { useCallback } from "react";

import type { EntityLinkType } from "@domains/relations/entityLink";
import type { EntityId } from "@domains/shared/types";
import { t } from "@i18n/index";

import { useDeviceId } from "../hooks";
import { useEntityLinkActions } from "../hooks/useEntityLinkActions";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import { useOrganizations, useAccounts, useAllContacts } from "../store/store";
import { TwoTierLinkModal } from "./TwoTierLinkModal";

type LinkEntityToNoteModalProps = {
  visible: boolean;
  onClose: () => void;
  noteId: EntityId;
  existingEntityIds: Set<EntityId>;
};

export const LinkEntityToNoteModal = ({
  visible,
  onClose,
  noteId,
  existingEntityIds,
}: LinkEntityToNoteModalProps) => {
  const deviceId = useDeviceId();
  const { linkNote } = useEntityLinkActions(deviceId);
  const { dialogProps, showAlert } = useConfirmDialog();

  const organizations = useOrganizations();
  const accounts = useAccounts();
  const contacts = useAllContacts();

  const handleLink = useCallback(
    (
      targetId: EntityId,
      entityType: EntityLinkType,
      entityId: EntityId,
    ): { success: boolean; error?: string } => {
      const result = linkNote(noteId, entityType, entityId);

      if (!result.success) {
        showAlert(
          t("common.error"),
          result.error ?? t("notes.linkError"),
          t("common.ok"),
        );
      }

      return result;
    },
    [linkNote, noteId, showAlert],
  );

  return (
    <TwoTierLinkModal
      visible={visible}
      onClose={onClose}
      targetId={noteId}
      targetType="note"
      existingEntityIds={existingEntityIds}
      organizations={organizations}
      accounts={accounts}
      contacts={contacts}
      onLink={handleLink}
      dialogProps={dialogProps}
    />
  );
};
