import { StyleSheet, Text, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import type { NotesStackScreenProps } from "../../navigation/types";
import { ListCard } from "../../components";
import { useTheme } from "../../hooks";
import { useAllNotes, useAllInteractions } from "../../store/store";
import { t } from "@i18n/index";

type Props = NotesStackScreenProps<"NotesAndInteractionsLanding">;

export const NotesAndInteractionsLandingScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const allNotes = useAllNotes();
  const allInteractions = useAllInteractions();

  const handleNotesPress = () => {
    navigation.navigate("NotesList");
  };

  const handleInteractionsPress = () => {
    navigation.navigate("InteractionsList");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <ListCard onPress={handleNotesPress}>
        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="notebook-outline"
              size={32}
              color={colors.accent}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t("notes.title")}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              View and manage all notes
            </Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={[styles.countText, { color: colors.textSecondary }]}>
              {allNotes.length}
            </Text>
          </View>
        </View>
      </ListCard>

      <ListCard onPress={handleInteractionsPress}>
        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="lightning-bolt-outline"
              size={32}
              color={colors.accent}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t("interactions.title")}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              View and log all interactions
            </Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={[styles.countText, { color: colors.textSecondary }]}>
              {allInteractions.length}
            </Text>
          </View>
        </View>
      </ListCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
  },
  countBadge: {
    minWidth: 32,
    alignItems: "flex-end",
  },
  countText: {
    fontSize: 20,
    fontWeight: "600",
  },
});
