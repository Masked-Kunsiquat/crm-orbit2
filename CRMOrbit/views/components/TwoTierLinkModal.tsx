import { useMemo, useCallback, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import type { EntityLinkType } from "@domains/relations/entityLink";
import type { EntityId } from "@domains/shared/types";
import type { Organization } from "@domains/organization";
import type { Account } from "@domains/account";
import type { Contact } from "@domains/contact";
import { getContactDisplayName } from "@domains/contact.utils";
import { t } from "@i18n/index";

import { useTheme } from "../hooks";
import { ConfirmDialog } from "./ConfirmDialog";
import type { useConfirmDialog } from "../hooks/useConfirmDialog";
import { ListEmptyState } from "./ListEmptyState";

type LinkableEntityType = "organization" | "account" | "contact";
type ConfirmDialogProps = ReturnType<typeof useConfirmDialog>["dialogProps"];

interface TwoTierLinkModalProps {
  visible: boolean;
  onClose: () => void;
  targetId: EntityId;
  targetType: "note" | "interaction";
  existingEntityIds: Set<EntityId>;
  organizations: Organization[];
  accounts: Account[];
  contacts: Contact[];
  onLink: (
    targetId: EntityId,
    entityType: EntityLinkType,
    entityId: EntityId,
  ) => { success: boolean; error?: string };
  dialogProps?: ConfirmDialogProps;
}

export const TwoTierLinkModal = ({
  visible,
  onClose,
  targetId,
  targetType,
  existingEntityIds,
  organizations,
  accounts,
  contacts,
  onLink,
  dialogProps,
}: TwoTierLinkModalProps) => {
  const { colors } = useTheme();
  const [selectedEntityType, setSelectedEntityType] =
    useState<LinkableEntityType | null>(null);

  const entityTypes: Array<{
    type: LinkableEntityType;
    label: string;
    count: number;
  }> = [
    {
      type: "organization",
      label: t("organizations.title"),
      count: organizations.length,
    },
    { type: "account", label: t("accounts.title"), count: accounts.length },
    { type: "contact", label: t("contacts.title"), count: contacts.length },
  ];

  const currentEntities = useMemo(() => {
    let entities: Array<{ id: string; name: string }> = [];

    switch (selectedEntityType) {
      case "organization":
        entities = organizations.map((org: Organization) => ({
          id: org.id,
          name: org.name,
        }));
        break;
      case "account":
        entities = accounts.map((acc: Account) => ({
          id: acc.id,
          name: acc.name,
        }));
        break;
      case "contact":
        entities = contacts.map((contact: Contact) => ({
          id: contact.id,
          name: getContactDisplayName(contact),
        }));
        break;
      default:
        return [];
    }

    return entities.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }, [selectedEntityType, organizations, accounts, contacts]);

  const handleSelectEntityType = useCallback((type: LinkableEntityType) => {
    setSelectedEntityType(type);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedEntityType(null);
  }, []);

  const handleLink = useCallback(
    (entityId: EntityId) => {
      if (!selectedEntityType || existingEntityIds.has(entityId)) {
        return;
      }

      const result = onLink(
        targetId,
        selectedEntityType as EntityLinkType,
        entityId,
      );

      if (result.success) {
        onClose();
        setSelectedEntityType(null);
        return;
      }

      // Error handling is done by the parent via dialogProps
    },
    [
      selectedEntityType,
      existingEntityIds,
      onLink,
      targetId,
      onClose,
    ],
  );

  const handleClose = useCallback(() => {
    setSelectedEntityType(null);
    onClose();
  }, [onClose]);

  return (
    <>
      <Modal
        transparent
        animationType="slide"
        visible={visible}
        onRequestClose={handleClose}
      >
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
          <View
            style={[
              styles.modal,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.header}>
              {selectedEntityType ? (
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                  <Text style={[styles.backText, { color: colors.textPrimary }]}>
                    ‹ {t("common.back")}
                  </Text>
                </TouchableOpacity>
              ) : null}
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {selectedEntityType
                  ? t(`${selectedEntityType}s.linkTitle`)
                  : t(`${targetType}s.linkToEntity`)}
              </Text>
            </View>

            {!selectedEntityType ? (
              <FlatList
                data={entityTypes}
                keyExtractor={(item) => item.type}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.typeItem,
                      {
                        borderColor: colors.borderLight,
                        backgroundColor: colors.surfaceElevated,
                      },
                    ]}
                    onPress={() => handleSelectEntityType(item.type)}
                  >
                    <Text
                      style={[
                        styles.typeLabel,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Text
                      style={[styles.typeCount, { color: colors.textSecondary }]}
                    >
                      {item.count}
                    </Text>
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.listContent}
              />
            ) : currentEntities.length === 0 ? (
              <ListEmptyState
                title={t(`${selectedEntityType}s.emptyTitle`)}
                hint={t(`${selectedEntityType}s.emptyHint`)}
                style={styles.emptyState}
              />
            ) : (
              <FlatList
                data={currentEntities}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const isLinked = existingEntityIds.has(item.id);
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
                      onPress={() => handleLink(item.id)}
                      disabled={isLinked}
                    >
                      <Text
                        style={[
                          styles.itemText,
                          {
                            color: isLinked
                              ? colors.textMuted
                              : colors.textPrimary,
                          },
                        ]}
                      >
                        {item.name}
                      </Text>
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
              onPress={handleClose}
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
    backgroundColor: "rgba(0, 0, 0, 0.4)",
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  backButton: {
    marginRight: 12,
  },
  backText: {
    fontSize: 18,
    fontWeight: "600",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
  },
  listContent: {
    paddingBottom: 8,
  },
  typeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  typeCount: {
    fontSize: 14,
  },
  item: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  itemDisabled: {
    opacity: 0.5,
  },
  itemText: {
    fontSize: 15,
    fontWeight: "600",
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
