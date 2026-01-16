import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import type { MiscStackScreenProps } from "../../navigation/types";
import {
  ActionButton,
  ConfirmDialog,
  FormField,
  FormScreenLayout,
  Section,
  SegmentedOptionGroup,
  TextField,
} from "../../components";
import { useTheme } from "../../hooks";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import { useRandomizer } from "../../hooks/useRandomizer";
import { RANDOMIZER_ERROR_KEYS } from "../../utils/randomizer";
import { t } from "@i18n/index";

export const RandomizerScreen = (
  _props: MiscStackScreenProps<"Randomizer">,
) => {
  const { colors } = useTheme();
  const { dialogProps, showAlert } = useConfirmDialog();
  const {
    eligibleAccounts,
    selectedAccount,
    selectedAccountId,
    isPickerOpen,
    minInput,
    maxInput,
    excludedInput,
    countInput,
    order,
    results,
    setIsPickerOpen,
    setMinInput,
    setMaxInput,
    setExcludedInput,
    setCountInput,
    setOrder,
    applyAccountValues,
    generate,
  } = useRandomizer();

  const handleGenerate = () => {
    const result = generate();
    if (!result.ok) {
      showAlert(
        t("common.validationError"),
        t(RANDOMIZER_ERROR_KEYS[result.error]),
        t("common.ok"),
      );
    }
  };

  const handleCopy = async () => {
    if (results.length === 0) return;
    const valueToCopy = results.join(", ");
    try {
      await Clipboard.setStringAsync(valueToCopy);
      showAlert(
        t("randomizer.copyTitle"),
        t("randomizer.copySuccess"),
        t("common.ok"),
      );
    } catch {
      showAlert(t("common.error"), t("randomizer.copyError"), t("common.ok"));
    }
  };

  return (
    <FormScreenLayout>
      <Section>
        <View style={styles.resultsHeader}>
          <View style={styles.resultsTitleRow}>
            <MaterialCommunityIcons
              name="dice-multiple"
              size={18}
              color={colors.textSecondary}
            />
            <Text style={[styles.resultsTitle, { color: colors.textPrimary }]}>
              {t("randomizer.results.title")}
            </Text>
          </View>
          <View
            style={[
              styles.resultsBadge,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[styles.resultsBadgeText, { color: colors.textSecondary }]}
            >
              {results.length}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.resultsPanel,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          {results.length === 0 ? (
            <Text
              style={[styles.resultsPlaceholder, { color: colors.textMuted }]}
            >
              {t("randomizer.results.empty")}
            </Text>
          ) : (
            <Text
              selectable
              style={[styles.resultsText, { color: colors.textPrimary }]}
            >
              {results.join(", ")}
            </Text>
          )}
        </View>
        <View style={styles.resultsActions}>
          <ActionButton
            variant="primary"
            size="compact"
            label={
              results.length > 0
                ? t("randomizer.actions.redraw")
                : t("randomizer.actions.generate")
            }
            onPress={handleGenerate}
          />
          <ActionButton
            size="compact"
            tone="link"
            label={t("randomizer.actions.copy")}
            onPress={handleCopy}
            disabled={results.length === 0}
          />
        </View>
      </Section>

      <Section title={t("randomizer.sections.source")}>
        {eligibleAccounts.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t("randomizer.accountEmpty")}
          </Text>
        ) : (
          <FormField label={t("randomizer.fields.account")}>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setIsPickerOpen(true)}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.pickerButtonText,
                  { color: colors.textSecondary },
                ]}
              >
                {selectedAccount?.name ?? t("randomizer.accountPlaceholder")}
              </Text>
              <Text style={[styles.pickerChevron, { color: colors.chevron }]}>
                ▼
              </Text>
            </TouchableOpacity>
            <Text style={[styles.hintText, { color: colors.textMuted }]}>
              {t("randomizer.accountHint")}
            </Text>
          </FormField>
        )}
      </Section>

      <Section title={t("randomizer.sections.inputs")}>
        <View style={styles.inputRow}>
          <View style={styles.inputColumn}>
            <FormField label={t("randomizer.fields.min")}>
              <TextField
                value={minInput}
                onChangeText={setMinInput}
                placeholder={t("randomizer.placeholders.min")}
                keyboardType="number-pad"
              />
            </FormField>
          </View>
          <View style={styles.inputColumn}>
            <FormField label={t("randomizer.fields.max")}>
              <TextField
                value={maxInput}
                onChangeText={setMaxInput}
                placeholder={t("randomizer.placeholders.max")}
                keyboardType="number-pad"
              />
            </FormField>
          </View>
        </View>
        <FormField
          label={t("randomizer.fields.excluded")}
          hint={t("randomizer.placeholders.excluded")}
        >
          <TextField
            value={excludedInput}
            onChangeText={setExcludedInput}
            placeholder={t("randomizer.placeholders.excluded")}
          />
        </FormField>
        <View style={styles.inputRow}>
          <View style={styles.inputColumn}>
            <FormField label={t("randomizer.fields.count")}>
              <TextField
                value={countInput}
                onChangeText={setCountInput}
                placeholder={t("randomizer.placeholders.count")}
                keyboardType="number-pad"
              />
            </FormField>
          </View>
          <View style={styles.inputColumn}>
            <FormField label={t("randomizer.fields.order")}>
              <SegmentedOptionGroup
                options={[
                  { value: "asc", label: t("randomizer.order.asc") },
                  { value: "desc", label: t("randomizer.order.desc") },
                ]}
                value={order}
                onChange={setOrder}
              />
            </FormField>
          </View>
        </View>
      </Section>

      <Modal
        visible={isPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPickerOpen(false)}
      >
        <View
          style={[
            styles.modalOverlay,
            { backgroundColor: colors.overlayScrim },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIsPickerOpen(false)}
          />
          <View
            style={[
              styles.pickerModal,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {t("randomizer.accountPickerTitle")}
              </Text>
              <TouchableOpacity onPress={() => setIsPickerOpen(false)}>
                <MaterialCommunityIcons
                  name="close"
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList}>
              <TouchableOpacity
                style={[
                  styles.pickerItem,
                  { borderColor: colors.border },
                  !selectedAccountId && {
                    backgroundColor: colors.surfaceElevated,
                  },
                ]}
                onPress={() => {
                  applyAccountValues(null);
                  setIsPickerOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerItemText,
                    { color: colors.textPrimary },
                    !selectedAccountId && { color: colors.accent },
                  ]}
                >
                  {t("randomizer.accountManual")}
                </Text>
              </TouchableOpacity>
              {eligibleAccounts.map((account) => {
                const isSelected = account.id === selectedAccountId;
                const min = account.minFloor ?? "--";
                const max = account.maxFloor ?? "--";
                return (
                  <TouchableOpacity
                    key={account.id}
                    style={[
                      styles.pickerItem,
                      { borderColor: colors.border },
                      isSelected && {
                        backgroundColor: colors.surfaceElevated,
                      },
                    ]}
                    onPress={() => {
                      applyAccountValues(account.id);
                      setIsPickerOpen(false);
                    }}
                  >
                    <View style={styles.pickerRow}>
                      <Text
                        style={[
                          styles.pickerItemText,
                          { color: colors.textPrimary },
                          isSelected && { color: colors.accent },
                        ]}
                      >
                        {account.name}
                      </Text>
                      <Text
                        style={[styles.pickerMeta, { color: colors.textMuted }]}
                      >
                        {t("randomizer.accountFloors", {
                          min,
                          max,
                        })}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {dialogProps ? <ConfirmDialog {...dialogProps} /> : null}
    </FormScreenLayout>
  );
};

const styles = StyleSheet.create({
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  resultsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  resultsBadge: {
    minWidth: 32,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  resultsBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  resultsPanel: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    minHeight: 72,
    justifyContent: "center",
  },
  resultsPlaceholder: {
    fontSize: 14,
  },
  resultsText: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
  },
  resultsActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  pickerButton: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pickerButtonText: {
    fontSize: 16,
  },
  pickerChevron: {
    fontSize: 12,
  },
  hintText: {
    fontSize: 12,
    marginTop: 6,
  },
  emptyText: {
    fontSize: 14,
  },
  inputRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  inputColumn: {
    flex: 1,
    minWidth: 140,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  pickerModal: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    maxHeight: "70%",
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
  pickerList: {
    marginBottom: 12,
  },
  pickerItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  pickerItemText: {
    fontSize: 15,
    fontWeight: "500",
  },
  pickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  pickerMeta: {
    fontSize: 12,
  },
});
