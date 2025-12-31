import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal, FlatList } from "react-native";

import type { ContactsStackScreenProps } from "@views/navigation/types";
import { useContact, useAccountsByContact, useAccounts, useAccountContactRelations } from "@views/store/store";
import { useContactActions } from "@views/hooks/useContactActions";
import { useAccountActions } from "@views/hooks/useAccountActions";

const DEVICE_ID = "device-local";

type Props = ContactsStackScreenProps<"ContactDetail">;

export const ContactDetailScreen = ({ route, navigation }: Props) => {
  const { contactId } = route.params;
  const contact = useContact(contactId);
  const linkedAccounts = useAccountsByContact(contactId);
  const allAccounts = useAccounts();
  const accountContactRelations = useAccountContactRelations();
  const { deleteContact } = useContactActions(DEVICE_ID);
  const { linkContact, unlinkContact } = useAccountActions(DEVICE_ID);

  const [showLinkModal, setShowLinkModal] = useState(false);

  if (!contact) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Contact not found</Text>
      </View>
    );
  }

  const handleEdit = () => {
    navigation.navigate("ContactForm", { contactId: contact.id });
  };

  const handleLinkAccount = (accountId: string) => {
    // Check if already linked
    const existingLink = Object.values(accountContactRelations).find(
      (relation) => relation.accountId === accountId && relation.contactId === contactId,
    );

    if (existingLink) {
      Alert.alert("Already Linked", "This contact is already linked to this account");
      return;
    }

    // Check if account already has a primary contact
    const hasPrimary = Object.values(accountContactRelations).some(
      (relation) => relation.accountId === accountId && relation.isPrimary,
    );

    const result = linkContact(accountId, contactId, "account.contact.role.primary", !hasPrimary);

    if (result.success) {
      setShowLinkModal(false);
    } else {
      Alert.alert("Error", result.error ?? "Failed to link contact");
    }
  };

  const handleUnlinkAccount = (accountId: string, accountName: string) => {
    Alert.alert(
      "Unlink Contact",
      `Unlink "${contact.name}" from "${accountName}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Unlink",
          style: "destructive",
          onPress: () => {
            const result = unlinkContact(accountId, contactId);
            if (!result.success) {
              Alert.alert("Error", result.error ?? "Failed to unlink contact");
            }
          },
        },
      ],
    );
  };

  const handleDelete = () => {
    if (linkedAccounts.length > 0) {
      Alert.alert(
        "Cannot Delete",
        `Cannot delete "${contact.name}" because it is linked to ${linkedAccounts.length} account(s). Please unlink the contact first.`,
        [{ text: "OK" }],
      );
      return;
    }

    Alert.alert(
      "Delete Contact",
      `Are you sure you want to delete "${contact.name}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const result = deleteContact(contact.id);
            if (result.success) {
              navigation.goBack();
            } else {
              Alert.alert("Error", result.error ?? "Failed to delete contact");
            }
          },
        },
      ],
    );
  };

  const getContactTypeLabel = (type: string) => {
    switch (type) {
      case "contact.type.internal":
        return "Internal";
      case "contact.type.external":
        return "External";
      case "contact.type.vendor":
        return "Vendor";
      default:
        return type;
    }
  };

  const getMethodLabel = (label: string) => {
    switch (label) {
      case "contact.method.label.work":
        return "Work";
      case "contact.method.label.personal":
        return "Personal";
      case "contact.method.label.other":
        return "Other";
      default:
        return label;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <View style={styles.header}>
          <Text style={styles.title}>{contact.name}</Text>
          <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Type</Text>
          <Text style={styles.value}>{getContactTypeLabel(contact.type)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Email Addresses ({contact.methods.emails.length})</Text>
        {contact.methods.emails.length === 0 ? (
          <Text style={styles.emptyText}>No email addresses</Text>
        ) : (
          contact.methods.emails.map((email, index) => (
            <View key={index} style={styles.methodItem}>
              <Text style={styles.methodValue}>{email.value}</Text>
              <Text style={styles.methodMeta}>
                {getMethodLabel(email.label)} •{" "}
                {email.status === "contact.method.status.active" ? "Active" : "Inactive"}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Phone Numbers ({contact.methods.phones.length})</Text>
        {contact.methods.phones.length === 0 ? (
          <Text style={styles.emptyText}>No phone numbers</Text>
        ) : (
          contact.methods.phones.map((phone, index) => (
            <View key={index} style={styles.methodItem}>
              <Text style={styles.methodValue}>{phone.value}</Text>
              <Text style={styles.methodMeta}>
                {getMethodLabel(phone.label)} •{" "}
                {phone.status === "contact.method.status.active" ? "Active" : "Inactive"}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.fieldHeader}>
          <Text style={styles.sectionTitle}>Linked Accounts ({linkedAccounts.length})</Text>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => setShowLinkModal(true)}
          >
            <Text style={styles.linkButtonText}>+ Link Account</Text>
          </TouchableOpacity>
        </View>
        {linkedAccounts.length === 0 ? (
          <Text style={styles.emptyText}>Not linked to any accounts</Text>
        ) : (
          linkedAccounts.map((account) => {
            const relation = Object.values(accountContactRelations).find(
              (r) => r.accountId === account.id && r.contactId === contactId,
            );
            return (
              <View key={account.id} style={styles.accountItem}>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{account.name}</Text>
                  {relation?.isPrimary && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryText}>Primary</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.unlinkButton}
                  onPress={() => handleUnlinkAccount(account.id, account.name)}
                >
                  <Text style={styles.unlinkButtonText}>Unlink</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteButtonText}>Delete Contact</Text>
      </TouchableOpacity>

      <Modal
        visible={showLinkModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLinkModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Link to Account</Text>
            <FlatList
              data={allAccounts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isLinked = linkedAccounts.some((a) => a.id === item.id);
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, isLinked && styles.modalItemDisabled]}
                    onPress={() => handleLinkAccount(item.id)}
                    disabled={isLinked}
                  >
                    <Text style={[styles.modalItemText, isLinked && styles.modalItemTextDisabled]}>
                      {item.name}
                      {isLinked && " (Already linked)"}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowLinkModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f2ee",
  },
  section: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1b1b1b",
    flex: 1,
  },
  editButton: {
    backgroundColor: "#1f5eff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  value: {
    fontSize: 16,
    color: "#1b1b1b",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1b1b1b",
    marginBottom: 12,
  },
  methodItem: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  methodValue: {
    fontSize: 15,
    color: "#1b1b1b",
    marginBottom: 2,
  },
  methodMeta: {
    fontSize: 13,
    color: "#666",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },
  errorText: {
    fontSize: 16,
    color: "#b00020",
    textAlign: "center",
    marginTop: 32,
  },
  deleteButton: {
    backgroundColor: "#b00020",
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  fieldHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  linkButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#1f5eff",
  },
  linkButtonText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
  },
  accountItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  accountInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  accountName: {
    fontSize: 15,
    color: "#1b1b1b",
  },
  unlinkButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#ffebee",
  },
  unlinkButtonText: {
    fontSize: 12,
    color: "#b00020",
    fontWeight: "600",
  },
  primaryBadge: {
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryText: {
    fontSize: 12,
    color: "#4caf50",
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1b1b1b",
    marginBottom: 16,
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalItemDisabled: {
    opacity: 0.5,
  },
  modalItemText: {
    fontSize: 16,
    color: "#1b1b1b",
  },
  modalItemTextDisabled: {
    color: "#999",
  },
  modalCancelButton: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
});
