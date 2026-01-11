import { useMemo, useCallback } from "react";
import { Text } from "react-native";

import type { EntityLinkType } from "@domains/relations/entityLink";
import type { EntityId } from "@domains/shared/types";
import type { Interaction } from "@domains/interaction";
import { t } from "@i18n/index";

import { useDeviceId } from "../hooks";
import { useEntityLinkActions } from "../hooks/useEntityLinkActions";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import { useAllInteractions } from "../store/store";
import { BaseLinkModal } from "./BaseLinkModal";
import { linkModalItemStyles } from "./linkModalItemStyles";

type LinkEntityType = Exclude<EntityLinkType, "note" | "interaction">;

type LinkInteractionModalProps = {
  visible: boolean;
  onClose: () => void;
  entityType: LinkEntityType;
  entityId: EntityId;
  existingInteractionIds: EntityId[];
};

export const LinkInteractionModal = ({
  visible,
  onClose,
  entityType,
  entityId,
  existingInteractionIds,
}: LinkInteractionModalProps) => {
  const deviceId = useDeviceId();
  const { linkInteraction } = useEntityLinkActions(deviceId);
  const interactions = useAllInteractions();
  const { dialogProps, showAlert } = useConfirmDialog();

  const existingIds = useMemo(
    () => new Set(existingInteractionIds),
    [existingInteractionIds],
  );

  const sortedInteractions = useMemo(() => {
    return [...interactions].sort((a, b) => {
      const aTime = Date.parse(a.occurredAt);
      const bTime = Date.parse(b.occurredAt);
      return bTime - aTime;
    });
  }, [interactions]);

  const handleItemPress = useCallback(
    (interaction: Interaction) => {
      if (existingIds.has(interaction.id)) {
        return;
      }
      const result = linkInteraction(interaction.id, entityType, entityId);
      if (result.success) {
        onClose();
        return;
      }
      showAlert(
        t("common.error"),
        result.error ?? t("interactions.linkError"),
        t("common.ok"),
      );
    },
    [entityId, entityType, existingIds, linkInteraction, onClose, showAlert],
  );

  const renderItem = useCallback(
    (interaction: Interaction, isLinked: boolean, colors: any) => (
      <>
        <Text
          style={[
            linkModalItemStyles.itemType,
            {
              color: isLinked ? colors.textMuted : colors.textSecondary,
            },
          ]}
        >
          {t(interaction.type)}
        </Text>
        <Text
          style={[
            linkModalItemStyles.itemSummary,
            {
              color: isLinked ? colors.textMuted : colors.textPrimary,
            },
          ]}
          numberOfLines={2}
        >
          {interaction.summary}
        </Text>
        <Text
          style={[
            linkModalItemStyles.itemMeta,
            {
              color: isLinked ? colors.textMuted : colors.textSecondary,
            },
          ]}
        >
          {new Date(interaction.occurredAt).toLocaleString()}
        </Text>
      </>
    ),
    [],
  );

  return (
    <BaseLinkModal
      visible={visible}
      onClose={onClose}
      title={t("interactions.linkTitle")}
      items={sortedInteractions}
      existingIds={existingIds}
      emptyTitle={t("interactions.emptyTitle")}
      emptyHint={t("interactions.emptyHint")}
      keyExtractor={(interaction) => interaction.id}
      renderItem={renderItem}
      onItemPress={handleItemPress}
      dialogProps={dialogProps}
    />
  );
};
