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
import { useAllInteractions } from "../store/store";
import { ConfirmDialog } from "./ConfirmDialog";
import { ListEmptyState } from "./ListEmptyState";

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
  const { colors } = useTheme();
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

  const handleLink = useCallback(
    (interactionId: EntityId) => {
      if (existingIds.has(interactionId)) {
        return;
      }
      const result = linkInteraction(interactionId, entityType, entityId);
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
              {t("interactions.linkTitle")}
            </Text>
            {sortedInteractions.length === 0 ? (
              <ListEmptyState
                title={t("interactions.emptyTitle")}
                hint={t("interactions.emptyHint")}
                style={styles.emptyState}
              />
            ) : (
              <FlatList
                data={sortedInteractions}
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
                          styles.itemType,
                          {
                            color: isLinked
                              ? colors.textMuted
                              : colors.textSecondary,
                          },
                        ]}
                      >
                        {t(item.type)}
                      </Text>
                      <Text
                        style={[
                          styles.itemSummary,
                          {
                            color: isLinked
                              ? colors.textMuted
                              : colors.textPrimary,
                          },
                        ]}
                        numberOfLines={2}
                      >
                        {item.summary}
                      </Text>
                      <Text
                        style={[
                          styles.itemMeta,
                          {
                            color: isLinked
                              ? colors.textMuted
                              : colors.textSecondary,
                          },
                        ]}
                      >
                        {new Date(item.occurredAt).toLocaleString()}
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
  itemType: {
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: "600",
    marginBottom: 4,
  },
  itemSummary: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 6,
  },
  itemMeta: {
    fontSize: 12,
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
