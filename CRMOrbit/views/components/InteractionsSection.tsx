import { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
} from "react-native";

import type { Interaction } from "@domains/interaction";
import type { EntityId } from "@domains/shared/types";
import { t } from "@i18n/index";

import { useDeviceId, useTheme } from "../hooks";
import { useEntityLinkActions } from "../hooks/useEntityLinkActions";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import { useDoc } from "../store/store";
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

export const InteractionsSection = ({
  interactions,
  entityId,
  entityType,
  navigation,
}: InteractionsSectionProps) => {
  const { colors } = useTheme();
  const deviceId = useDeviceId();
  const doc = useDoc();
  const { unlinkInteraction } = useEntityLinkActions(deviceId);
  const { dialogProps, showDialog } = useConfirmDialog();
  const [showLinkModal, setShowLinkModal] = useState(false);

  const existingInteractionIds = useMemo(
    () => interactions.map((interaction) => interaction.id),
    [interactions],
  );
  const linkIdsByInteractionId = useMemo(() => {
    const entries = Object.entries(doc.relations.entityLinks);
    const map = new Map<EntityId, EntityId>();
    for (const [linkId, link] of entries) {
      if (
        link.linkType === "interaction" &&
        link.interactionId &&
        link.entityType === entityType &&
        link.entityId === entityId
      ) {
        map.set(link.interactionId, linkId);
      }
    }
    return map;
  }, [doc.relations.entityLinks, entityId, entityType]);

  const handleUnlink = (interactionId: EntityId, summary: string) => {
    const linkId = linkIdsByInteractionId.get(interactionId);
    if (!linkId) {
      return;
    }
    showDialog({
      title: t("interactions.unlinkTitle"),
      message: t("interactions.unlinkConfirmation").replace("{name}", summary),
      confirmLabel: t("interactions.unlinkAction"),
      confirmVariant: "danger",
      cancelLabel: t("common.cancel"),
      onConfirm: () => {
        unlinkInteraction(linkId, {
          interactionId,
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
          {t("interactions.title")} ({interactions.length})
        </Text>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.accent }]}
            onPress={() =>
              navigation.navigate("InteractionForm", {
                entityToLink: { entityId, entityType },
              })
            }
          >
            <Text style={[styles.addButtonText, { color: colors.onAccent }]}>
              {t("interactions.form.logButton")}
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
              {t("interactions.linkExisting")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {interactions.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {t("interactions.emptyTitle")}
        </Text>
      ) : (
        interactions.map((interaction) => (
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
                  style={[styles.interactionMeta, { color: colors.textMuted }]}
                >
                  {new Date(interaction.occurredAt).toLocaleString()}
                </Text>
              </View>
              <Text style={[styles.chevron, { color: colors.chevron }]}>›</Text>
            </Pressable>
            <TouchableOpacity
              style={[styles.unlinkButton, { backgroundColor: colors.errorBg }]}
              onPress={() => handleUnlink(interaction.id, interaction.summary)}
            >
              <Text style={[styles.unlinkButtonText, { color: colors.error }]}>
                {t("interactions.unlinkButton")}
              </Text>
            </TouchableOpacity>
          </View>
        ))
      )}
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
  interactionCard: {
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  interactionCardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
