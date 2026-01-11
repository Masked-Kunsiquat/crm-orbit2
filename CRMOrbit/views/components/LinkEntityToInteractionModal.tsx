import { useCallback } from "react";

import type { EntityLinkType } from "@domains/relations/entityLink";
import type { EntityId } from "@domains/shared/types";
import { t } from "@i18n/index";

import { useDeviceId } from "../hooks";
import { useEntityLinkActions } from "../hooks/useEntityLinkActions";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import { useOrganizations, useAccounts, useAllContacts } from "../store/store";
import { TwoTierLinkModal } from "./TwoTierLinkModal";

type LinkEntityToInteractionModalProps = {
  visible: boolean;
  onClose: () => void;
  interactionId: EntityId;
  existingEntityIds: Set<EntityId>;
};

export const LinkEntityToInteractionModal = ({
  visible,
  onClose,
  interactionId,
  existingEntityIds,
}: LinkEntityToInteractionModalProps) => {
  const deviceId = useDeviceId();
  const { linkInteraction } = useEntityLinkActions(deviceId);
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
      const result = linkInteraction(interactionId, entityType, entityId);

      if (!result.success) {
        showAlert(
          t("common.error"),
          result.error ?? t("interactions.linkError"),
          t("common.ok"),
        );
      }

      return result;
    },
    [linkInteraction, interactionId, showAlert],
  );

  return (
    <TwoTierLinkModal
      visible={visible}
      onClose={onClose}
      targetId={interactionId}
      targetType="interaction"
      existingEntityIds={existingEntityIds}
      organizations={organizations}
      accounts={accounts}
      contacts={contacts}
      onLink={handleLink}
      dialogProps={dialogProps}
    />
  );
};
