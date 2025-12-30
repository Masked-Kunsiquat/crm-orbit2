import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { ContactsStackScreenProps } from "../../navigation/types";
import { useAllContacts } from "../../crm-core/views/store";
import type { Contact } from "../../crm-core/domains/contact";

type Props = ContactsStackScreenProps<"ContactsList">;

export const ContactsListScreen = ({ navigation }: Props) => {
  const contacts = useAllContacts();

  const handlePress = (contact: Contact) => {
    navigation.navigate("ContactDetail", { contactId: contact.id });
  };

  const handleAdd = () => {
    navigation.navigate("ContactForm", {});
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

  const getPrimaryEmail = (contact: Contact) => {
    return contact.methods.emails.find((e) => e.status === "contact.method.status.active")?.value;
  };

  const renderItem = ({ item }: { item: Contact }) => (
    <TouchableOpacity style={styles.item} onPress={() => handlePress(item)}>
      <View style={styles.itemContent}>
        <Text style={styles.itemName}>{item.name}</Text>
        {getPrimaryEmail(item) && (
          <Text style={styles.itemEmail}>{getPrimaryEmail(item)}</Text>
        )}
        <Text style={styles.itemType}>{getContactTypeLabel(item.type)}</Text>
      </View>
      <Text style={styles.itemChevron}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={contacts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No contacts yet</Text>
            <Text style={styles.emptyHint}>Tap the + button to create one</Text>
          </View>
        }
      />
      <TouchableOpacity style={styles.fab} onPress={handleAdd}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f2ee",
  },
  list: {
    padding: 16,
  },
  item: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1b1b1b",
    marginBottom: 4,
  },
  itemEmail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  itemType: {
    fontSize: 12,
    color: "#999",
  },
  itemChevron: {
    fontSize: 24,
    color: "#ccc",
    marginLeft: 12,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: "#bbb",
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1f5eff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: {
    fontSize: 32,
    color: "#fff",
    fontWeight: "300",
  },
});
