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

import { useDeviceId, useTheme } from "../hooks";
import { useEntityLinkActions } from "../hooks/useEntityLinkActions";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import { useOrganizations, useAccounts, useAllContacts } from "../store/store";
import { ConfirmDialog } from "./ConfirmDialog";
import { ListEmptyState } from "./ListEmptyState";

type LinkableEntityType = "organization" | "account" | "contact";

type LinkEntityToNoteModalProps = {
  visible: boolean;
  onClose: () => void;
  noteId: EntityId;
  existingEntityIds: Set<EntityId>;
};

export const LinkEntityToNoteModal = ({
  visible,
  onClose,
  noteId,
  existingEntityIds,
}: LinkEntityToNoteModalProps) => {
  const { colors } = useTheme();
  const deviceId = useDeviceId();
  const { linkNote } = useEntityLinkActions(deviceId);
  const { dialogProps, showAlert } = useConfirmDialog();

  const [selectedEntityType, setSelectedEntityType] =
    useState<LinkableEntityType | null>(null);

  const organizations = useOrganizations();
  const accounts = useAccounts();
  const contacts = useAllContacts();

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

      const result = linkNote(
        noteId,
        selectedEntityType as EntityLinkType,
        entityId,
      );

      if (result.success) {
        onClose();
        setSelectedEntityType(null);
        return;
      }

      showAlert(
        t("common.error"),
        result.error ?? t("notes.linkError"),
        t("common.ok"),
      );
    },
    [
      existingEntityIds,
      linkNote,
      noteId,
      onClose,
      selectedEntityType,
      showAlert,
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
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleBack}
                >
                  <Text style={[styles.backText, { color: colors.accent }]}>
                    ← {t("common.back")}
                  </Text>
                </TouchableOpacity>
              ) : null}
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {selectedEntityType
                  ? t(`${selectedEntityType}s.linkTitle`)
                  : t("notes.linkToEntity")}
              </Text>
            </View>

            {!selectedEntityType ? (
              <View style={styles.typeSelection}>
                {entityTypes.map((entityType) => (
                  <TouchableOpacity
                    key={entityType.type}
                    style={[
                      styles.typeButton,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.surfaceElevated,
                      },
                    ]}
                    onPress={() => handleSelectEntityType(entityType.type)}
                  >
                    <Text
                      style={[
                        styles.typeButtonLabel,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {entityType.label}
                    </Text>
                    <Text
                      style={[
                        styles.typeButtonCount,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {entityType.count}{" "}
                      {entityType.count === 1 ? "item" : "items"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
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
                          styles.itemName,
                          {
                            color: isLinked
                              ? colors.textMuted
                              : colors.textPrimary,
                          },
                        ]}
                      >
                        {item.name}
                        {isLinked ? ` (${t("common.alreadyLinked")})` : ""}
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
    marginBottom: 12,
  },
  backButton: {
    marginBottom: 8,
  },
  backText: {
    fontSize: 14,
    fontWeight: "600",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  typeSelection: {
    gap: 12,
    paddingVertical: 8,
  },
  typeButton: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  typeButtonLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  typeButtonCount: {
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 8,
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
  itemName: {
    fontSize: 15,
    fontWeight: "500",
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
