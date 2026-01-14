import { useCallback } from "react";

import type { EntityLinkType } from "@domains/relations/entityLink";
import type { EntityId } from "@domains/shared/types";
import { t } from "@i18n/index";

import { useDeviceId } from "../hooks";
import { useCalendarEventActions } from "../hooks/useCalendarEventActions";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import { useOrganizations, useAccounts, useAllContacts } from "../store/store";
import { TwoTierLinkModal } from "./TwoTierLinkModal";

type LinkEntityToCalendarEventModalProps = {
  visible: boolean;
  onClose: () => void;
  calendarEventId: EntityId;
  existingEntityIds: Set<EntityId>;
};

export const LinkEntityToCalendarEventModal = ({
  visible,
  onClose,
  calendarEventId,
  existingEntityIds,
}: LinkEntityToCalendarEventModalProps) => {
  const deviceId = useDeviceId();
  const { linkCalendarEvent } = useCalendarEventActions(deviceId);
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
      const result = linkCalendarEvent(targetId, entityType, entityId);

      if (!result.success) {
        showAlert(
          t("common.error"),
          result.error ?? t("calendarEvents.linkError"),
          t("common.ok"),
        );
      }

      return result;
    },
    [linkCalendarEvent, showAlert],
  );

  return (
    <TwoTierLinkModal
      visible={visible}
      onClose={onClose}
      targetId={calendarEventId}
      targetType="calendarEvent"
      existingEntityIds={existingEntityIds}
      organizations={organizations}
      accounts={accounts}
      contacts={contacts}
      onLink={handleLink}
      dialogProps={dialogProps}
    />
  );
};
