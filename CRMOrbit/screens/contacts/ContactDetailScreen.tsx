import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { ContactsStackScreenProps } from "../../navigation/types";
import { useContact, useAccountContactRelations } from "../../crm-core/views/store";
import { useContactActions } from "../../crm-core/hooks/useContactActions";

const DEVICE_ID = "device-local";

type Props = ContactsStackScreenProps<"ContactDetail">;

export const ContactDetailScreen = ({ route, navigation }: Props) => {
  const { contactId } = route.params;
  const contact = useContact(contactId);
  const accountContactRelations = useAccountContactRelations();
  const { deleteContact } = useContactActions(DEVICE_ID);

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

  const handleDelete = () => {
    // Check if contact is linked to any accounts
    const linkedAccounts = Object.values(accountContactRelations).filter(
      (relation) => relation.contactId === contactId,
    );

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

      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteButtonText}>Delete Contact</Text>
      </TouchableOpacity>
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
});
