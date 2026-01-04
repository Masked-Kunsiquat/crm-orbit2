import { useMemo } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import type { Code } from "@domains/code";
import { t } from "@i18n/index";

import { useTheme } from "../hooks";
import { Section } from "./Section";

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
                <Text
                  style={[styles.codeType, { color: colors.textSecondary }]}
                >
                  {t(code.type)}
                </Text>
                <Text style={[styles.codeValue, { color: colors.textPrimary }]}>
                  {code.codeValue}
                </Text>
              </View>
              <Text style={[styles.chevron, { color: colors.chevron }]}>›</Text>
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
  codeType: {
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: "600",
    marginBottom: 4,
  },
  codeValue: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  chevron: {
    fontSize: 20,
    marginLeft: 8,
  },
});
