import { Pressable, StyleSheet, Text } from "react-native";
import { useLayoutEffect, useMemo } from "react";

import type { ContactsStackScreenProps } from "@views/navigation/types";
import { useAllContacts } from "@views/store/store";
import type { Contact } from "@domains/contact";
import { getContactDisplayName, getPrimaryEmail } from "@domains/contact.utils";
import {
  HeaderMenu,
  ListRow,
  ListScreenLayout,
} from "@views/components";
import { useHeaderMenu, useTheme } from "@views/hooks";
import { t } from "@i18n/index";

type Props = ContactsStackScreenProps<"ContactsList">;

export const ContactsListScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const contacts = useAllContacts();
  const { menuVisible, menuAnchorRef, closeMenu, headerRight } = useHeaderMenu({
    accessibilityLabel: "Contact list options",
  });
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
      headerRight,
    });
  }, [navigation, headerRight]);

  const renderItem = ({ item }: { item: Contact }) => {
    const primaryEmail = getPrimaryEmail(item);
    return (
      <ListRow
        onPress={() => handlePress(item)}
        title={getContactDisplayName(item)}
        subtitle={item.title}
        subtitleItalic={Boolean(item.title)}
        description={primaryEmail}
        footnote={t(item.type)}
        showChevron
      />
    );
  };

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
        onRequestClose={closeMenu}
      >
        <Pressable
          accessibilityRole="button"
          onPress={closeMenu}
          style={styles.menuItem}
        >
          <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>
            {t("contacts.moreOptionsSoon")}
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
});
