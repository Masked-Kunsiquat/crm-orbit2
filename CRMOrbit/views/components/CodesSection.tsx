import { useMemo, useState, type ComponentProps } from "react";
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
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

import type { Code, CodeType } from "@domains/code";
import { t } from "@i18n/index";

import { useTheme } from "../hooks";
import { Section } from "./Section";

type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>["name"];
type FontAwesome6IconName = ComponentProps<typeof FontAwesome6>["name"];

const CODE_TYPE_ICONS: Record<
  Exclude<CodeType, "code.type.other">,
  MaterialIconName
> = {
  "code.type.door": "door-closed-lock",
  "code.type.lockbox": "lock-outline",
  "code.type.alarm": "alarm-light-outline",
  "code.type.gate": "gate",
};

const OTHER_CODE_ICON: FontAwesome6IconName = "lines-leaning";
const MASKED_VALUE = "********";

type CodesSectionProps = {
  codes: Code[];
  accountId: string;
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
};

const PREVIEW_LIMIT = 3;

export const CodesSection = ({
  codes,
  accountId,
  navigation,
}: CodesSectionProps) => {
  const { colors } = useTheme();
  const [showAllModal, setShowAllModal] = useState(false);
  const sortedCodes = useMemo(() => {
    return [...codes].sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
    );
  }, [codes]);
  const visibleCodes = sortedCodes.slice(0, PREVIEW_LIMIT);
  const hasMore = sortedCodes.length > PREVIEW_LIMIT;

  return (
    <Section>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t("codes.title")} ({codes.length})
        </Text>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.accent }]}
            onPress={() =>
              navigation.navigate("CodeForm", {
                accountId,
              })
            }
            accessibilityLabel={t("codes.addButton")}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name="plus"
              size={18}
              color={colors.onAccent}
            />
          </TouchableOpacity>
        </View>
      </View>

      {sortedCodes.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {t("codes.emptyAccountCodes")}
        </Text>
      ) : (
        visibleCodes.map((code) => (
          <View
            key={code.id}
            style={[
              styles.codeCard,
              { backgroundColor: colors.surfaceElevated },
            ]}
          >
            <Pressable
              style={styles.codeCardRow}
              onPress={() =>
                navigation.navigate("CodeDetail", { codeId: code.id })
              }
            >
              <View style={styles.codeCardContent}>
                <Text style={[styles.codeLabel, { color: colors.textPrimary }]}>
                  {code.label}
                </Text>
                <Text style={[styles.codeValue, { color: colors.textPrimary }]}>
                  {code.isEncrypted ? MASKED_VALUE : code.codeValue}
                </Text>
              </View>
              <View style={styles.typeIconContainer}>
                {code.type === "code.type.other" ? (
                  <FontAwesome6
                    name={OTHER_CODE_ICON}
                    size={20}
                    color={colors.accent}
                  />
                ) : (
                  <MaterialCommunityIcons
                    name={CODE_TYPE_ICONS[code.type]}
                    size={22}
                    color={colors.accent}
                  />
                )}
              </View>
            </Pressable>
          </View>
        ))
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
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {t("codes.title")} ({codes.length})
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
              data={sortedCodes}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.modalItem,
                    { borderBottomColor: colors.borderLight },
                  ]}
                  onPress={() => {
                    setShowAllModal(false);
                    navigation.navigate("CodeDetail", { codeId: item.id });
                  }}
                >
                  <View style={styles.modalItemRow}>
                    <View style={styles.modalItemContent}>
                      <Text
                        style={[
                          styles.modalItemLabel,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Text
                        style={[
                          styles.modalItemValue,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {item.isEncrypted ? MASKED_VALUE : item.codeValue}
                      </Text>
                    </View>
                    <View style={styles.typeIconContainer}>
                      {item.type === "code.type.other" ? (
                        <FontAwesome6
                          name={OTHER_CODE_ICON}
                          size={20}
                          color={colors.accent}
                        />
                      ) : (
                        <MaterialCommunityIcons
                          name={CODE_TYPE_ICONS[item.type]}
                          size={22}
                          color={colors.accent}
                        />
                      )}
                    </View>
                  </View>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
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
  emptyText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  codeCard: {
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  codeCardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  codeCardContent: {
    flex: 1,
  },
  codeLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  codeValue: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  typeIconContainer: {
    minWidth: 28,
    alignItems: "flex-end",
    marginLeft: 8,
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
    backgroundColor: "rgba(0, 0, 0, 0.35)",
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
  modalItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalItemContent: {
    flex: 1,
  },
  modalItemLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  modalItemValue: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
