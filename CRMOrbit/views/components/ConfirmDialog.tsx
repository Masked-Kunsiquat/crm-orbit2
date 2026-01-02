import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../hooks";

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  cancelLabel?: string;
  onCancel?: () => void;
  confirmVariant?: "primary" | "danger";
};

export const ConfirmDialog = ({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  cancelLabel,
  onCancel,
  confirmVariant = "primary",
}: ConfirmDialogProps) => {
  const { colors } = useTheme();
  const showCancel = Boolean(cancelLabel && onCancel);
  const handleRequestClose =
    onCancel ?? (confirmVariant === "danger" ? undefined : onConfirm);

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      {...(handleRequestClose ? { onRequestClose: handleRequestClose } : {})}
    >
      <View style={styles.overlay}>
        {onCancel ? (
          <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        ) : null}
        <View
          style={[
            styles.dialog,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {title}
          </Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {message}
          </Text>
          <View style={styles.actions}>
            {showCancel ? (
              <Pressable
                style={[
                  styles.button,
                  styles.cancelButton,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.borderLight,
                  },
                ]}
                onPress={onCancel}
              >
                <Text
                  style={[styles.buttonText, { color: colors.textPrimary }]}
                >
                  {cancelLabel}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[
                styles.button,
                {
                  backgroundColor:
                    confirmVariant === "danger" ? colors.error : colors.accent,
                },
              ]}
              onPress={onConfirm}
            >
              <Text
                style={[
                  styles.buttonText,
                  {
                    color:
                      confirmVariant === "danger"
                        ? colors.onError
                        : colors.onAccent,
                  },
                ]}
              >
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  dialog: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 16,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 88,
    alignItems: "center",
  },
  cancelButton: {
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
