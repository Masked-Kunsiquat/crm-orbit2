import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

import { useAccount, useCode } from "../../store/store";
import { useDeviceId, useTheme } from "../../hooks";
import { useCodeActions } from "../../hooks/useCodeActions";
import {
  ConfirmDialog,
  DangerActionButton,
  DetailField,
  DetailScreenLayout,
  PrimaryActionButton,
  Section,
} from "../../components";
import { t } from "@i18n/index";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import type { CodeType } from "../../../domains/code";

const CODE_TYPE_ICONS: Record<CodeType, string> = {
  "code.type.door": "door-closed-lock",
  "code.type.lockbox": "lock-outline",
  "code.type.alarm": "alarm-light-outline",
  "code.type.gate": "gate",
  "code.type.other": "lines-leaning",
};

type Props = {
  route: { params: { codeId: string } };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
};

export const CodeDetailScreen = ({ route, navigation }: Props) => {
  const { codeId } = route.params;
  const code = useCode(codeId);
  const account = useAccount(code?.accountId ?? "");
  const deviceId = useDeviceId();
  const { deleteCode } = useCodeActions(deviceId);
  const { colors } = useTheme();
  const { dialogProps, showDialog, showAlert } = useConfirmDialog();

  if (!code) {
    return (
      <DetailScreenLayout>
        <Text style={[styles.errorText, { color: colors.error }]}>
          {t("codes.notFound")}
        </Text>
      </DetailScreenLayout>
    );
  }

  const accountName = account?.name ?? t("common.unknownEntity");

  const handleEdit = () => {
    navigation.navigate("CodeForm", { codeId: code.id });
  };

  const handleDelete = () => {
    showDialog({
      title: t("codes.deleteTitle"),
      message: t("codes.deleteConfirmation"),
      confirmLabel: t("common.delete"),
      confirmVariant: "danger",
      cancelLabel: t("common.cancel"),
      onConfirm: () => {
        const result = deleteCode(code.id);
        if (result.success) {
          navigation.goBack();
        } else {
          showAlert(
            t("common.error"),
            result.error ?? t("codes.deleteError"),
            t("common.ok"),
          );
        }
      },
    });
  };

  return (
    <DetailScreenLayout>
      <Section>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {code.label}
              </Text>
              {code.type === "code.type.other" ? (
                <FontAwesome6
                  name={CODE_TYPE_ICONS[code.type]}
                  size={18}
                  color={colors.accent}
                />
              ) : (
                <MaterialCommunityIcons
                  name={CODE_TYPE_ICONS[code.type]}
                  size={20}
                  color={colors.accent}
                />
              )}
            </View>
          </View>
          <PrimaryActionButton
            label={t("common.edit")}
            onPress={handleEdit}
            size="compact"
          />
        </View>

        <DetailField label={t("codes.fields.account")}>
          {account ? (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("AccountDetail", {
                  accountId: account.id,
                })
              }
            >
              <Text style={[styles.link, { color: colors.link }]}>
                {accountName}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.value, { color: colors.textPrimary }]}>
              {accountName}
            </Text>
          )}
        </DetailField>

        <DetailField label={t("codes.fields.value")}>
          <Text style={[styles.codeValue, { color: colors.textPrimary }]}>
            {code.codeValue}
          </Text>
        </DetailField>

        {code.notes ? (
          <DetailField label={t("codes.fields.notes")}>
            {code.notes}
          </DetailField>
        ) : null}
      </Section>

      <DangerActionButton
        label={t("codes.deleteButton")}
        onPress={handleDelete}
        size="block"
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
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  codeValue: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 16,
  },
  link: {
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 32,
  },
});
