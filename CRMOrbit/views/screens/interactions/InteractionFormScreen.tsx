import { useState, useEffect } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";

import { useInteraction } from "../../store/store";
import { useInteractionActions } from "../../hooks";
import type { InteractionType } from "../../../domains/interaction";
import {
  FormField,
  FormScreenLayout,
  TextField,
  ConfirmDialog,
  SegmentedOptionGroup,
} from "../../components";
import { t } from "@i18n/index";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import { useTheme } from "../../hooks";

const DEVICE_ID = "device-local";

const INTERACTION_TYPES: Array<{ label: string; value: InteractionType }> = [
  { label: "interaction.type.call", value: "interaction.type.call" },
  { label: "interaction.type.email", value: "interaction.type.email" },
  { label: "interaction.type.meeting", value: "interaction.type.meeting" },
  { label: "interaction.type.other", value: "interaction.type.other" },
];

type Props = {
  route: { params?: { interactionId?: string } };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
};

export const InteractionFormScreen = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const { interactionId } = route.params ?? {};
  const interaction = useInteraction(interactionId ?? "");
  const { logInteraction, updateInteraction } =
    useInteractionActions(DEVICE_ID);
  const { dialogProps, showAlert } = useConfirmDialog();

  const [type, setType] = useState<InteractionType>("interaction.type.call");
  const [summary, setSummary] = useState("");
  const [occurredAt, setOccurredAt] = useState("");

  useEffect(() => {
    if (interaction) {
      setType(interaction.type);
      setSummary(interaction.summary);
      setOccurredAt(interaction.occurredAt);
    } else {
      // Set default to current date/time
      setOccurredAt(new Date().toISOString());
    }
  }, [interaction]);

  const handleSave = () => {
    if (!summary.trim()) {
      showAlert(
        t("common.error"),
        t("interactions.validation.summaryRequired"),
        t("common.ok"),
      );
      return;
    }

    const occurredAtISO = occurredAt || new Date().toISOString();

    if (interactionId) {
      const result = updateInteraction(
        interactionId,
        type,
        summary.trim(),
        occurredAtISO,
        interaction,
      );
      if (result.success) {
        navigation.goBack();
      } else {
        showAlert(
          t("common.error"),
          result.error || t("interactions.updateError"),
          t("common.ok"),
        );
      }
    } else {
      const result = logInteraction(type, summary.trim(), occurredAtISO);
      if (result.success) {
        navigation.goBack();
      } else {
        showAlert(
          t("common.error"),
          result.error || t("interactions.createError"),
          t("common.ok"),
        );
      }
    }
  };

  return (
    <FormScreenLayout>
      <ScrollView style={styles.container}>
        <FormField label={t("interactions.form.typeLabel")}>
          <SegmentedOptionGroup
            options={INTERACTION_TYPES.map((item) => ({
              label: t(item.label),
              value: item.value,
            }))}
            value={type}
            onChange={(value) => setType(value as InteractionType)}
          />
        </FormField>

        <FormField label={t("interactions.form.summaryLabel")}>
          <TextField
            value={summary}
            onChangeText={setSummary}
            placeholder={t("interactions.form.summaryPlaceholder")}
            multiline
            numberOfLines={4}
            style={styles.summaryInput}
          />
        </FormField>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.accent }]}
          onPress={handleSave}
        >
          <Text style={[styles.saveButtonText, { color: colors.onAccent }]}>
            {interactionId
              ? t("interactions.form.updateButton")
              : t("interactions.form.logButton")}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {dialogProps ? <ConfirmDialog {...dialogProps} /> : null}
    </FormScreenLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryInput: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  saveButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
