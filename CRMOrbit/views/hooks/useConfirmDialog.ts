import { useState, useCallback } from "react";

type ConfirmDialogConfig = {
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant?: "primary" | "danger";
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
};

type ConfirmDialogProps = ConfirmDialogConfig & {
  visible: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
};

export const useConfirmDialog = () => {
  const [dialogConfig, setDialogConfig] = useState<ConfirmDialogConfig | null>(
    null,
  );

  const hideDialog = useCallback(() => setDialogConfig(null), []);

  const showDialog = (config: ConfirmDialogConfig) => {
    setDialogConfig(config);
  };

  const showAlert = (
    title: string,
    message: string,
    confirmLabel: string,
    onConfirm?: () => void,
  ) => {
    setDialogConfig({
      title,
      message,
      confirmLabel,
      onConfirm,
    });
  };

  const dialogProps: ConfirmDialogProps | null = dialogConfig
    ? {
        visible: true,
        title: dialogConfig.title,
        message: dialogConfig.message,
        confirmLabel: dialogConfig.confirmLabel,
        confirmVariant: dialogConfig.confirmVariant,
        cancelLabel: dialogConfig.cancelLabel,
        onConfirm: () => {
          const handler = dialogConfig.onConfirm;
          hideDialog();
          handler?.();
        },
        onCancel: dialogConfig.cancelLabel
          ? () => {
              const handler = dialogConfig.onCancel;
              hideDialog();
              handler?.();
            }
          : undefined,
      }
    : null;

  return { dialogProps, showDialog, showAlert, hideDialog };
};
