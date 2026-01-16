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

import type { Interaction } from "@domains/interaction";
import type { EntityId } from "@domains/shared/types";
import { t } from "@i18n/index";

import {
  useDeviceId,
  useTheme,
  useEntityLinkMap,
  useInteractionUnlink,
} from "../hooks";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import { ConfirmDialog } from "./ConfirmDialog";
import { LinkInteractionModal } from "./LinkInteractionModal";
import { Section } from "./Section";

type EntityType = "account" | "organization" | "contact";

interface InteractionsSectionProps {
  interactions: Interaction[];
  entityId: string;
  entityType: EntityType;
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

const PREVIEW_LIMIT = 3;

export const InteractionsSection = ({
  interactions,
  entityId,
  entityType,
  navigation,
}: InteractionsSectionProps) => {
  const { colors } = useTheme();
  const deviceId = useDeviceId();
  const { dialogProps, showDialog } = useConfirmDialog();
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);

  const existingInteractionIds = useMemo(
    () => interactions.map((interaction) => interaction.id),
    [interactions],
  );
  const linkIdsByInteractionId = useEntityLinkMap(
    "interaction",
    entityType,
    entityId,
  );
  const unlinkController = useInteractionUnlink({
    entityType,
    entityId,
    linkIdsByInteractionId,
    deviceId,
  });

  const handleUnlink = (interactionId: EntityId, summary: string) => {
    if (!unlinkController.canUnlink(interactionId)) {
      return;
    }
    showDialog({
      title: t("interactions.unlinkTitle"),
      message: unlinkController.getConfirmationMessage(summary),
      confirmLabel: t("interactions.unlinkAction"),
      confirmVariant: "danger",
      cancelLabel: t("common.cancel"),
      onConfirm: () => {
        unlinkController.executeUnlink(interactionId);
      },
    });
  };

  const visibleInteractions = interactions.slice(0, PREVIEW_LIMIT);
  const hasMore = interactions.length > PREVIEW_LIMIT;

  return (
    <Section>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t("interactions.title")} ({interactions.length})
        </Text>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.accent }]}
            onPress={() =>
              navigation.navigate("InteractionForm", {
                entityToLink: { entityId, entityType },
              })
            }
            accessibilityLabel={t("interactions.form.logButton")}
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
            accessibilityLabel={t("interactions.linkExisting")}
          >
            <MaterialCommunityIcons
              name="link-variant-plus"
              size={18}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
        </View>
      </View>
      {interactions.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {t("interactions.emptyTitle")}
        </Text>
      ) : (
        visibleInteractions.map((interaction) => {
          const resolvedStatus =
            interaction.status ?? "interaction.status.completed";
          const usesScheduledTimestamp =
            resolvedStatus !== "interaction.status.completed";
          const timestampLabel = usesScheduledTimestamp
            ? t("interactions.scheduledFor")
            : t("interactions.occurredAt");
          const timestampValue = usesScheduledTimestamp
            ? (interaction.scheduledFor ?? interaction.occurredAt)
            : interaction.occurredAt;
          const formattedTimestamp = (() => {
            const date = new Date(timestampValue);
            if (Number.isNaN(date.getTime())) {
              return t("common.unknown");
            }
            return date.toLocaleString();
          })();
          const metaText =
            resolvedStatus === "interaction.status.completed"
              ? `${timestampLabel}: ${formattedTimestamp}`
              : `${t("interactions.statusLabel")}: ${t(
                  resolvedStatus,
                )} · ${timestampLabel}: ${formattedTimestamp}`;
          return (
            <View
              key={interaction.id}
              style={[
                styles.interactionCard,
                { backgroundColor: colors.surfaceElevated },
              ]}
            >
              <Pressable
                style={styles.interactionCardRow}
                onPress={() => {
                  navigation.navigate("InteractionDetail", {
                    interactionId: interaction.id,
                  });
                }}
              >
                <View style={styles.interactionCardContent}>
                  <Text
                    style={[
                      styles.interactionType,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t(interaction.type)}
                  </Text>
                  <Text
                    style={[
                      styles.interactionSummary,
                      { color: colors.textPrimary },
                    ]}
                    numberOfLines={2}
                  >
                    {interaction.summary}
                  </Text>
                  <Text
                    style={[
                      styles.interactionMeta,
                      { color: colors.textMuted },
                    ]}
                  >
                    {metaText}
                  </Text>
                </View>
              </Pressable>
              <TouchableOpacity
                style={[
                  styles.unlinkButton,
                  { backgroundColor: colors.errorBg },
                ]}
                onPress={() =>
                  handleUnlink(interaction.id, interaction.summary)
                }
                accessibilityLabel={t("interactions.unlinkButton")}
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
        <View
          style={[
            styles.modalOverlay,
            { backgroundColor: colors.overlayScrim },
          ]}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {t("interactions.title")} ({interactions.length})
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
              data={interactions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const resolvedStatus =
                  item.status ?? "interaction.status.completed";
                const usesScheduledTimestamp =
                  resolvedStatus !== "interaction.status.completed";
                const timestampLabel = usesScheduledTimestamp
                  ? t("interactions.scheduledFor")
                  : t("interactions.occurredAt");
                const timestampValue = usesScheduledTimestamp
                  ? (item.scheduledFor ?? item.occurredAt)
                  : item.occurredAt;
                const formattedTimestamp = (() => {
                  const date = new Date(timestampValue);
                  if (Number.isNaN(date.getTime())) {
                    return t("common.unknown");
                  }
                  return date.toLocaleString();
                })();
                const metaText =
                  resolvedStatus === "interaction.status.completed"
                    ? `${timestampLabel}: ${formattedTimestamp}`
                    : `${t("interactions.statusLabel")}: ${t(
                        resolvedStatus,
                      )} · ${timestampLabel}: ${formattedTimestamp}`;
                return (
                  <Pressable
                    style={[
                      styles.modalItem,
                      { borderBottomColor: colors.borderLight },
                    ]}
                    onPress={() => {
                      setShowAllModal(false);
                      navigation.navigate("InteractionDetail", {
                        interactionId: item.id,
                      });
                    }}
                  >
                    <Text
                      style={[
                        styles.modalItemType,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t(item.type)}
                    </Text>
                    <Text
                      style={[
                        styles.modalItemTitle,
                        { color: colors.textPrimary },
                      ]}
                      numberOfLines={2}
                    >
                      {item.summary}
                    </Text>
                    <Text
                      style={[
                        styles.modalItemMeta,
                        { color: colors.textMuted },
                      ]}
                    >
                      {metaText}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
      <LinkInteractionModal
        visible={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        entityType={entityType}
        entityId={entityId}
        existingInteractionIds={existingInteractionIds}
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
  interactionCard: {
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  interactionCardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  interactionCardContent: {
    flex: 1,
  },
  interactionType: {
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: "600",
    marginBottom: 4,
  },
  interactionSummary: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  interactionMeta: {
    fontSize: 12,
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
  modalItemType: {
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: "600",
    marginBottom: 4,
  },
  modalItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  modalItemMeta: {
    fontSize: 12,
  },
});
