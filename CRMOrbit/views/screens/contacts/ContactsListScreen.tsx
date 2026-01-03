import { FlatList, Pressable, StyleSheet, Text } from "react-native";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

import type { ContactsStackScreenProps } from "@views/navigation/types";
import { useAllContacts } from "@views/store/store";
import type { Contact } from "@domains/contact";
import { getContactDisplayName } from "@domains/contact.utils";
import {
  AlphabetScrollbar,
  ContactTypeBadge,
  HeaderMenu,
  ListRow,
  ListScreenLayout,
} from "@views/components";
import { useHeaderMenu, useTheme } from "@views/hooks";
import { t } from "@i18n/index";

type Props = ContactsStackScreenProps<"ContactsList">;
type SortBy = "firstName" | "lastName";

export const ContactsListScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const contacts = useAllContacts();
  const flatListRef = useRef<FlatList<Contact>>(null);
  const [sortBy, setSortBy] = useState<SortBy>("firstName");

  const { menuVisible, menuAnchorRef, closeMenu, headerRight } = useHeaderMenu({
    accessibilityLabel: t("contacts.listOptions"),
  });

  const sortedContacts = useMemo(() => {
    return [...contacts].sort((a, b) => {
      let aValue: string;
      let bValue: string;

      if (sortBy === "firstName") {
        aValue = a.firstName || a.lastName || a.name || "";
        bValue = b.firstName || b.lastName || b.name || "";
      } else {
        aValue = a.lastName || a.firstName || a.name || "";
        bValue = b.lastName || b.firstName || b.name || "";
      }

      return aValue.localeCompare(bValue, undefined, { sensitivity: "base" });
    });
  }, [contacts, sortBy]);

  // Alphabet scrollbar data: # for symbols/numbers, then A-Z
  const alphabetData = useMemo(
    () => [
      "#",
      ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)),
    ],
    [],
  );

  const handleAlphabetSelect = (char: string) => {
    const index = sortedContacts.findIndex((contact) => {
      let checkValue: string;
      if (sortBy === "firstName") {
        checkValue = (
          contact.firstName ||
          contact.lastName ||
          contact.name ||
          ""
        ).toUpperCase();
      } else {
        checkValue = (
          contact.lastName ||
          contact.firstName ||
          contact.name ||
          ""
        ).toUpperCase();
      }

      const firstChar = checkValue.charAt(0);
      if (char === "#") {
        return !/[A-Z]/.test(firstChar);
      }
      return firstChar === char;
    });

    if (index !== -1) {
      flatListRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0,
      });
    }
  };

  const toggleSortBy = () => {
    setSortBy((prev) => (prev === "firstName" ? "lastName" : "firstName"));
    closeMenu();
  };

  const handlePress = (contact: Contact) => {
    navigation.navigate("ContactDetail", { contactId: contact.id });
  };

  const handleAdd = () => {
    navigation.navigate("ContactForm", {});
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight,
    });
  }, [navigation, headerRight]);

  const renderItem = ({ item }: { item: Contact }) => {
    return (
      <ListRow
        onPress={() => handlePress(item)}
        title={getContactDisplayName(item)}
        subtitle={item.title}
        subtitleItalic={Boolean(item.title)}
        titleAccessory={
          <ContactTypeBadge type={item.type} style={styles.typeBadge} />
        }
      />
    );
  };

  return (
    <>
      <ListScreenLayout
        data={sortedContacts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        flatListRef={flatListRef}
        emptyTitle={t("contacts.emptyTitle")}
        emptyHint={t("contacts.emptyHint")}
        onAdd={handleAdd}
        rightAccessory={
          sortedContacts.length > 0 ? (
            <AlphabetScrollbar
              data={alphabetData}
              onCharSelect={handleAlphabetSelect}
            />
          ) : null
        }
      />
      <HeaderMenu
        anchorRef={menuAnchorRef}
        visible={menuVisible}
        onRequestClose={closeMenu}
      >
        <Pressable
          accessibilityRole="button"
          onPress={toggleSortBy}
          style={styles.menuItem}
        >
          <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>
            {sortBy === "firstName"
              ? t("contacts.sortByLastName")
              : t("contacts.sortByFirstName")}
          </Text>
        </Pressable>
      </HeaderMenu>
    </>
  );
};

const styles = StyleSheet.create({
  menuItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  menuItemText: {
    fontSize: 14,
  },
  typeBadge: {
    alignSelf: "center",
  },
});
