import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
} from "react-native";
import { useState, useMemo } from "react";

import {
  useInteraction,
  useEntitiesForInteraction,
  useTimeline,
  useDoc,
} from "../../store/store";
import { useInteractionActions } from "../../hooks/useInteractionActions";
import { useEntityLinkActions } from "../../hooks/useEntityLinkActions";
import {
  DetailScreenLayout,
  Section,
  PrimaryActionButton,
  DangerActionButton,
  ConfirmDialog,
  TimelineSection,
  LinkEntityToInteractionModal,
} from "../../components";
import { useDeviceId, useTheme } from "../../hooks";
import { t } from "@i18n/index";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";

type Props = {
  route: { params: { interactionId: string } };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
};

export const InteractionDetailScreen = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const deviceId = useDeviceId();
  const { interactionId } = route.params;
  const interaction = useInteraction(interactionId);
  const linkedEntities = useEntitiesForInteraction(interactionId);
  const timeline = useTimeline("interaction", interactionId);
  const doc = useDoc();
  const { deleteInteraction } = useInteractionActions(deviceId);
  const { unlinkInteraction } = useEntityLinkActions(deviceId);
  const { dialogProps, showDialog, showAlert } = useConfirmDialog();

  const [showLinkModal, setShowLinkModal] = useState(false);

  const existingEntityIds = useMemo(
    () => new Set(linkedEntities.map((entity) => entity.entityId)),
    [linkedEntities],
  );

  const handleEdit = () => {
    if (!interaction?.id) return;
    navigation.navigate("InteractionForm", { interactionId: interaction.id });
  };

  if (!interaction) {
    return (
      <DetailScreenLayout>
        <Text style={[styles.errorText, { color: colors.error }]}>
          {t("interactions.notFound")}
        </Text>
      </DetailScreenLayout>
    );
  }

  const handleUnlink = (
    linkId: string,
    name: string,
    entityType: (typeof linkedEntities)[number]["entityType"],
    entityId: string,
  ) => {
    showDialog({
      title: t("interactions.unlinkTitle"),
      message: t("interactions.unlinkConfirmation").replace("{name}", name),
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

  const navigateToEntity = (
    entityType: (typeof linkedEntities)[number]["entityType"],
    entityId: string,
  ) => {
    switch (entityType) {
      case "organization":
        navigation.navigate("OrganizationDetail", {
          organizationId: entityId,
        });
        break;
      case "account":
        navigation.navigate("AccountDetail", {
          accountId: entityId,
        });
        break;
      case "contact":
        navigation.navigate("ContactDetail", {
          contactId: entityId,
        });
        break;
      // Cannot navigate to a note or interaction from itself
      case "note":
      case "interaction":
      default:
        break;
    }
  };

  const handleDelete = () => {
    showDialog({
      title: t("interactions.deleteTitle"),
      message: t("interactions.deleteConfirmation"),
      confirmLabel: t("common.delete"),
      confirmVariant: "danger",
      cancelLabel: t("common.cancel"),
      onConfirm: () => {
        const result = deleteInteraction(interaction.id);
        if (result.success) {
          navigation.goBack();
        } else {
          showAlert(
            t("common.error"),
            result.error ?? t("interactions.deleteError"),
            t("common.ok"),
          );
        }
      },
    });
  };

  const resolvedStatus = interaction.status ?? "interaction.status.completed";
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

  return (
    <DetailScreenLayout>
      <Section>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[styles.typeLabel, { color: colors.textSecondary }]}>
              {t(interaction.type)}
            </Text>
            <Text style={[styles.summary, { color: colors.textPrimary }]}>
              {interaction.summary}
            </Text>
            <Text style={[styles.date, { color: colors.textSecondary }]}>
              {t("interactions.statusLabel")}: {t(resolvedStatus)}
            </Text>
            <Text style={[styles.date, { color: colors.textSecondary }]}>
              {timestampLabel}: {formattedTimestamp}
            </Text>
          </View>
          <PrimaryActionButton
            label={t("common.edit")}
            onPress={handleEdit}
            size="compact"
          />
        </View>
      </Section>

      <Section>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t("interactions.linkedTo")} ({linkedEntities.length})
          </Text>
          <TouchableOpacity
            style={[styles.linkButton, { backgroundColor: colors.accent }]}
            onPress={() => setShowLinkModal(true)}
          >
            <Text style={[styles.linkButtonText, { color: colors.onAccent }]}>
              {t("interactions.linkEntityButton")}
            </Text>
          </TouchableOpacity>
        </View>
        {linkedEntities.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t("interactions.noLinkedEntities")}
          </Text>
        ) : (
          linkedEntities.map((entity) => {
            const displayName = entity.name ?? t("common.unknownEntity");
            return (
              <View
                key={entity.linkId}
                style={[
                  styles.linkedItem,
                  { borderTopColor: colors.borderLight },
                ]}
              >
                <Pressable
                  style={styles.linkedItemPressable}
                  onPress={() =>
                    navigateToEntity(entity.entityType, entity.entityId)
                  }
                >
                  <Text
                    style={[
                      styles.linkedItemType,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {entity.entityType}
                  </Text>
                  <Text
                    style={[
                      styles.linkedItemName,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {displayName}
                  </Text>
                </Pressable>
                <TouchableOpacity
                  style={[
                    styles.unlinkButton,
                    { backgroundColor: colors.errorBg },
                  ]}
                  onPress={() =>
                    handleUnlink(
                      entity.linkId,
                      displayName,
                      entity.entityType,
                      entity.entityId,
                    )
                  }
                >
                  <Text
                    style={[styles.unlinkButtonText, { color: colors.error }]}
                  >
                    {t("interactions.unlinkButton")}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </Section>

      <TimelineSection timeline={timeline} doc={doc} />

      <DangerActionButton
        label={t("interactions.deleteButton")}
        onPress={handleDelete}
        size="block"
      />

      <LinkEntityToInteractionModal
        visible={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        interactionId={interactionId}
        existingEntityIds={existingEntityIds}
      />

      {dialogProps ? <ConfirmDialog {...dialogProps} /> : null}
    </DetailScreenLayout>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  typeLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: "600",
    marginBottom: 8,
  },
  summary: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    lineHeight: 24,
  },
  date: {
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  linkButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  linkButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  linkedItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  linkedItemPressable: {
    flex: 1,
  },
  linkedItemType: {
    fontSize: 12,
    textTransform: "capitalize",
  },
  linkedItemName: {
    fontSize: 15,
  },
  unlinkButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  unlinkButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 32,
  },
});
