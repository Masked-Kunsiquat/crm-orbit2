import { StyleSheet, Text, View } from "react-native";

import type { ContactsStackScreenProps } from "../../navigation/types";
import { useAllContacts } from "../../crm-core/views/store";
import type { Contact } from "../../crm-core/domains/contact";
import { ListCard, ListCardChevron, ListScreenLayout } from "../../components";
import { colors } from "../../theme/colors";

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
    <ListCard onPress={() => handlePress(item)} style={styles.cardRow}>
      <View style={styles.itemContent}>
        <Text style={styles.itemName}>{item.name}</Text>
        {getPrimaryEmail(item) ? (
          <Text style={styles.itemEmail}>{getPrimaryEmail(item)}</Text>
        ) : null}
        <Text style={styles.itemType}>{getContactTypeLabel(item.type)}</Text>
      </View>
      <ListCardChevron />
    </ListCard>
  );

  return (
    <ListScreenLayout
      data={contacts}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      emptyTitle="No contacts yet"
      emptyHint="Tap the + button to create one"
      onAdd={handleAdd}
    />
  );
};

const styles = StyleSheet.create({
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  itemEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  itemType: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
