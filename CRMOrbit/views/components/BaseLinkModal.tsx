import type { ReactNode } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { t } from "@i18n/index";
import { useTheme } from "../hooks";
import { ConfirmDialog } from "./ConfirmDialog";
import type { useConfirmDialog } from "../hooks/useConfirmDialog";
import { ListEmptyState } from "./ListEmptyState";

type ConfirmDialogProps = ReturnType<typeof useConfirmDialog>["dialogProps"];

export interface BaseLinkModalProps<T> {
  visible: boolean;
  onClose: () => void;
  title: string;
  items: T[];
  existingIds: Set<string>;
  emptyTitle: string;
  emptyHint: string;
  keyExtractor: (item: T) => string;
  renderItem: (
    item: T,
    isLinked: boolean,
    colors: ReturnType<typeof useTheme>["colors"],
  ) => ReactNode;
  onItemPress: (item: T) => void;
  dialogProps?: ConfirmDialogProps;
}

export const BaseLinkModal = <T,>({
  visible,
  onClose,
  title,
  items,
  existingIds,
  emptyTitle,
  emptyHint,
  keyExtractor,
  renderItem,
  onItemPress,
  dialogProps,
}: BaseLinkModalProps<T>) => {
  const { colors } = useTheme();

  return (
    <>
      <Modal
        transparent
        animationType="slide"
        visible={visible}
        onRequestClose={onClose}
      >
        <View
          style={[
            styles.overlay,
            { backgroundColor: colors.overlayScrimStrong },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View
            style={[
              styles.modal,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {title}
            </Text>
            {items.length === 0 ? (
              <ListEmptyState
                title={emptyTitle}
                hint={emptyHint}
                style={styles.emptyState}
              />
            ) : (
              <FlatList
                data={items}
                keyExtractor={keyExtractor}
                renderItem={({ item }) => {
                  const isLinked = existingIds.has(keyExtractor(item));
                  return (
                    <TouchableOpacity
                      style={[
                        styles.item,
                        {
                          borderColor: colors.borderLight,
                          backgroundColor: colors.surfaceElevated,
                        },
                        isLinked && styles.itemDisabled,
                      ]}
                      onPress={() => onItemPress(item)}
                      disabled={isLinked}
                    >
                      {renderItem(item, isLinked, colors)}
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={styles.listContent}
              />
            )}
            <TouchableOpacity
              style={[
                styles.cancelButton,
                { backgroundColor: colors.surfaceElevated },
              ]}
              onPress={onClose}
            >
              <Text style={[styles.cancelText, { color: colors.textPrimary }]}>
                {t("common.cancel")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {dialogProps ? <ConfirmDialog {...dialogProps} /> : null}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    maxHeight: "85%",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 8,
  },
  item: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  itemDisabled: {
    opacity: 0.5,
  },
  emptyState: {
    paddingVertical: 24,
  },
  cancelButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
