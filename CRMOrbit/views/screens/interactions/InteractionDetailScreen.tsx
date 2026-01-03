import { StyleSheet, Text } from "react-native";
import { useLayoutEffect, useCallback } from "react";

import { useInteraction, useTimeline, useDoc } from "../../store/store";
import { useInteractionActions } from "../../hooks/useInteractionActions";
import {
  DetailScreenLayout,
  Section,
  PrimaryActionButton,
  DangerActionButton,
  ConfirmDialog,
  TimelineSection,
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
  const timeline = useTimeline("interaction", interactionId);
  const doc = useDoc();
  const { deleteInteraction } = useInteractionActions(deviceId);
  const { dialogProps, showDialog, showAlert } = useConfirmDialog();

  const handleEdit = useCallback(() => {
    if (!interaction?.id) return;
    navigation.navigate("InteractionForm", { interactionId: interaction.id });
  }, [interaction?.id, navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <PrimaryActionButton
          label={t("common.edit")}
          onPress={handleEdit}
          size="compact"
          tone="link"
        />
      ),
    });
  }, [navigation, handleEdit, colors]);

  if (!interaction) {
    return (
      <DetailScreenLayout>
        <Text style={[styles.errorText, { color: colors.error }]}>
          {t("interactions.notFound")}
        </Text>
      </DetailScreenLayout>
    );
  }

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

  return (
    <DetailScreenLayout>
      <Section>
        <Text style={[styles.typeLabel, { color: colors.textSecondary }]}>
          {t(interaction.type)}
        </Text>
        <Text style={[styles.summary, { color: colors.textPrimary }]}>
          {interaction.summary}
        </Text>
        <Text style={[styles.date, { color: colors.textSecondary }]}>
          {t("interactions.occurredAt")}:{" "}
          {new Date(interaction.occurredAt).toLocaleString()}
        </Text>
      </Section>

      <TimelineSection timeline={timeline} doc={doc} />

      <DangerActionButton
        label={t("interactions.deleteButton")}
        onPress={handleDelete}
        size="block"
      />

      {dialogProps ? <ConfirmDialog {...dialogProps} /> : null}
    </DetailScreenLayout>
  );
};

const styles = StyleSheet.create({
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
    marginBottom: 4,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 32,
  },
});
