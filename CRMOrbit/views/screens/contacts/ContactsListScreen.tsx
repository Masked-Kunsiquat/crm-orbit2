import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

import type { ContactsStackScreenProps } from "@views/navigation/types";
import { useAllContacts } from "@views/store/store";
import type { Contact } from "@domains/contact";
import { getContactDisplayName, getPrimaryEmail } from "@domains/contact.utils";
import {
  HeaderMenu,
  ListCard,
  ListCardChevron,
  ListScreenLayout,
} from "@views/components";
import { colors } from "@domains/shared/theme/colors";
import { t } from "../../../i18n";

type Props = ContactsStackScreenProps<"ContactsList">;

export const ContactsListScreen = ({ navigation }: Props) => {
  const contacts = useAllContacts();
  const [menuVisible, setMenuVisible] = useState(false);
  const menuAnchorRef = useRef<View>(null);
  const sortedContacts = useMemo(() => {
    return [...contacts].sort((a, b) =>
      getContactDisplayName(a).localeCompare(
        getContactDisplayName(b),
        undefined,
        {
          sensitivity: "base",
        },
      ),
    );
  }, [contacts]);

  const handlePress = (contact: Contact) => {
    navigation.navigate("ContactDetail", { contactId: contact.id });
  };

  const handleAdd = () => {
    navigation.navigate("ContactForm", {});
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View ref={menuAnchorRef} style={styles.headerMenuWrapper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Contact list options"
            onPress={() => setMenuVisible((current) => !current)}
            style={styles.headerButton}
          >
            <Text style={styles.headerButtonText}>⋮</Text>
          </Pressable>
        </View>
      ),
    });
  }, [navigation]);

  const renderItem = ({ item }: { item: Contact }) => (
    <ListCard onPress={() => handlePress(item)} style={styles.cardRow}>
      <View style={styles.itemContent}>
        <Text style={styles.itemName}>{getContactDisplayName(item)}</Text>
        {item.title ? <Text style={styles.itemTitle}>{item.title}</Text> : null}
        {getPrimaryEmail(item) ? (
          <Text style={styles.itemEmail}>{getPrimaryEmail(item)}</Text>
        ) : null}
        <Text style={styles.itemType}>{t(item.type)}</Text>
      </View>
      <ListCardChevron />
    </ListCard>
  );

  return (
    <>
      <ListScreenLayout
        data={sortedContacts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        emptyTitle={t("contacts.emptyTitle")}
        emptyHint={t("contacts.emptyHint")}
        onAdd={handleAdd}
      />
      <HeaderMenu
        anchorRef={menuAnchorRef}
        visible={menuVisible}
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => setMenuVisible(false)}
          style={styles.menuItem}
        >
          <Text style={styles.menuItemText}>
            {t("contacts.moreOptionsSoon")}
          </Text>
        </Pressable>
      </HeaderMenu>
    </>
  );
};

const styles = StyleSheet.create({
  headerMenuWrapper: {
    position: "relative",
    alignItems: "flex-end",
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerButtonText: {
    fontSize: 18,
    color: colors.headerTint,
  },
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
  itemTitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
    fontStyle: "italic",
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
  menuItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  menuItemText: {
    color: colors.textPrimary,
    fontSize: 14,
  },
});
