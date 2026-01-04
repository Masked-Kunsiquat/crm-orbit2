import { useMemo, type ComponentProps } from "react";
import {
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

export const CodesSection = ({
  codes,
  accountId,
  navigation,
}: CodesSectionProps) => {
  const { colors } = useTheme();
  const sortedCodes = useMemo(() => {
    return [...codes].sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
    );
  }, [codes]);

  return (
    <Section>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t("codes.title")} ({codes.length})
        </Text>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.accent }]}
            onPress={() =>
              navigation.navigate("CodeForm", {
                accountId,
              })
            }
          >
            <Text style={[styles.addButtonText, { color: colors.onAccent }]}>
              {t("codes.addButton")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {sortedCodes.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {t("codes.emptyAccountCodes")}
        </Text>
      ) : (
        sortedCodes.map((code) => (
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
});
