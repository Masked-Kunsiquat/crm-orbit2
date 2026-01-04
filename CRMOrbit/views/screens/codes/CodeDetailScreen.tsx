import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { ComponentProps } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import * as Clipboard from "expo-clipboard";

import { useAccount, useCode, useSecuritySettings } from "../../store/store";
import { useDeviceId, useLocalAuth, useTheme } from "../../hooks";
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
import { decryptCode } from "@utils/encryption";

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
const DEFAULT_REVEAL_DURATION_MS = 30_000;
const MASKED_VALUE = "********";
let sessionAuthorized = false;

type Props = {
  route: { params: { codeId: string } };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
};

export const CodeDetailScreen = ({ route, navigation }: Props) => {
  const { codeId } = route.params;
  const code = useCode(codeId);
  const account = useAccount(code?.accountId ?? "");
  const securitySettings = useSecuritySettings();
  const deviceId = useDeviceId();
  const { deleteCode } = useCodeActions(deviceId);
  const { authenticate } = useLocalAuth();
  const { colors } = useTheme();
  const { dialogProps, showDialog, showAlert } = useConfirmDialog();
  const [isRevealed, setIsRevealed] = useState(false);
  const [revealedValue, setRevealedValue] = useState<string | null>(null);
  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRevealTimeout = useCallback(() => {
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }
  }, []);

  const resolveBlurTimeoutMs = useCallback((): number | null => {
    switch (securitySettings.blurTimeout) {
      case "15":
        return 15_000;
      case "30":
        return 30_000;
      case "60":
        return 60_000;
      case "never":
        return null;
      default:
        return DEFAULT_REVEAL_DURATION_MS;
    }
  }, [securitySettings.blurTimeout]);

  const revealWithTimeout = useCallback(() => {
    setIsRevealed(true);
    clearRevealTimeout();
    const timeoutMs = resolveBlurTimeoutMs();
    if (timeoutMs === null) {
      return;
    }
    revealTimeoutRef.current = setTimeout(() => {
      setIsRevealed(false);
      setRevealedValue(null);
      revealTimeoutRef.current = null;
    }, timeoutMs);
  }, [clearRevealTimeout, resolveBlurTimeoutMs]);

  const ensureAuthorized = useCallback(async (): Promise<boolean> => {
    if (securitySettings.biometricAuth === "disabled") {
      return true;
    }

    if (securitySettings.authFrequency === "session" && sessionAuthorized) {
      return true;
    }

    const success = await authenticate(t("codes.authReason"));
    if (success) {
      sessionAuthorized = true;
    }
    return success;
  }, [
    authenticate,
    securitySettings.authFrequency,
    securitySettings.biometricAuth,
  ]);

  const resolveDecryptedValue = useCallback(async (): Promise<string> => {
    if (!code) {
      return "";
    }
    if (!code.isEncrypted) {
      return code.codeValue;
    }
    return await decryptCode(code.codeValue);
  }, [code]);

  const handleReveal = useCallback(async () => {
    if (isRevealed) {
      return;
    }

    const isAuthorized = await ensureAuthorized();
    if (!isAuthorized) {
      return;
    }

    try {
      const nextValue = await resolveDecryptedValue();
      setRevealedValue(nextValue);
      revealWithTimeout();
    } catch {
      showAlert(t("common.error"), t("codes.decryptError"), t("common.ok"));
    }
  }, [
    ensureAuthorized,
    isRevealed,
    revealWithTimeout,
    resolveDecryptedValue,
    showAlert,
  ]);

  const handleHide = useCallback(() => {
    clearRevealTimeout();
    setIsRevealed(false);
    setRevealedValue(null);
  }, [clearRevealTimeout]);

  const handleCopy = useCallback(async () => {
    const isAuthorized = await ensureAuthorized();
    if (!isAuthorized) {
      return;
    }

    let valueToCopy = revealedValue ?? "";

    if (!isRevealed || !valueToCopy) {
      try {
        valueToCopy = await resolveDecryptedValue();
      } catch {
        showAlert(t("common.error"), t("codes.decryptError"), t("common.ok"));
        return;
      }
    }

    try {
      await Clipboard.setStringAsync(valueToCopy);
      showAlert(t("codes.copyTitle"), t("codes.copySuccess"), t("common.ok"));
    } catch {
      showAlert(t("common.error"), t("codes.copyError"), t("common.ok"));
    }
  }, [
    ensureAuthorized,
    isRevealed,
    revealedValue,
    resolveDecryptedValue,
    showAlert,
  ]);

  useEffect(() => {
    if (
      securitySettings.biometricAuth === "disabled" ||
      securitySettings.authFrequency === "each"
    ) {
      sessionAuthorized = false;
    }
  }, [securitySettings.authFrequency, securitySettings.biometricAuth]);

  useEffect(() => {
    if (!isRevealed) {
      return;
    }
    clearRevealTimeout();
    const timeoutMs = resolveBlurTimeoutMs();
    if (timeoutMs === null) {
      return;
    }
    revealTimeoutRef.current = setTimeout(() => {
      setIsRevealed(false);
      setRevealedValue(null);
      revealTimeoutRef.current = null;
    }, timeoutMs);
  }, [clearRevealTimeout, isRevealed, resolveBlurTimeoutMs]);

  useEffect(() => {
    return () => {
      clearRevealTimeout();
    };
  }, [clearRevealTimeout]);

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
                  name={OTHER_CODE_ICON}
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
          <View style={styles.codeValueContainer}>
            <Pressable
              onPress={isRevealed ? handleHide : handleReveal}
              style={[
                styles.codeValueRow,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
                isRevealed && {
                  backgroundColor: colors.successBg,
                  borderColor: colors.success,
                },
              ]}
            >
              <Text style={[styles.codeValue, { color: colors.textPrimary }]}>
                {isRevealed ? revealedValue ?? MASKED_VALUE : MASKED_VALUE}
              </Text>
              {!isRevealed ? (
                <Text
                  style={[styles.revealHint, { color: colors.textSecondary }]}
                >
                  {t("codes.tapToReveal")}
                </Text>
              ) : null}
            </Pressable>
            <PrimaryActionButton
              label={t("codes.copyButton")}
              onPress={handleCopy}
              size="compact"
              tone="link"
            />
          </View>
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
  codeValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  codeValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
  },
  revealHint: {
    fontSize: 12,
    fontWeight: "500",
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
