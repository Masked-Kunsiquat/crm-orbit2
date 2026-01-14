import { StyleSheet, Text, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import type { EventsStackScreenProps } from "../../navigation/types";
import { ListCard } from "../../components";
import { useTheme } from "../../hooks";
import { useAllCalendarEvents } from "../../store/store";
import { t } from "@i18n/index";

type Props = EventsStackScreenProps<"EventsLanding">;

export const EventsLandingScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const calendarEvents = useAllCalendarEvents();

  const handleCalendarPress = () => {
    navigation.navigate("Calendar");
  };

  const handleEventsPress = () => {
    navigation.navigate("CalendarEventsList");
  };

  const calendarCount = calendarEvents.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <ListCard onPress={handleCalendarPress}>
        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="calendar-month-outline"
              size={32}
              color={colors.accent}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t("calendar.title")}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {t("calendar.description")}
            </Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={[styles.countText, { color: colors.textSecondary }]}>
              {calendarCount}
            </Text>
          </View>
        </View>
      </ListCard>

      <ListCard onPress={handleEventsPress}>
        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="format-list-bulleted"
              size={32}
              color={colors.accent}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t("calendarEvents.listTitle")}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {t("calendarEvents.listDescription")}
            </Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={[styles.countText, { color: colors.textSecondary }]}>
              {calendarCount}
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
