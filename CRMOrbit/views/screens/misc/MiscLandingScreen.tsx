import { StyleSheet, Text, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import type { MiscStackScreenProps } from "../../navigation/types";
import { ListCard } from "../../components";
import { useTheme } from "../../hooks";
import {
  useAllAudits,
  useAllCodes,
  useAllInteractions,
} from "../../store/store";
import { t } from "@i18n/index";

type Props = MiscStackScreenProps<"MiscLanding">;

export const MiscLandingScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const allCodes = useAllCodes();
  const allAudits = useAllAudits();
  const allInteractions = useAllInteractions();

  const handleCodesPress = () => {
    navigation.navigate("CodesList");
  };

  const handleSyncPress = () => {
    navigation.navigate("Sync");
  };

  const handleAuditsPress = () => {
    navigation.navigate("AuditsList");
  };

  const handleCalendarPress = () => {
    navigation.navigate("Calendar");
  };

  const handleSettingsPress = () => {
    navigation.navigate("SettingsList");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <ListCard onPress={handleCodesPress}>
        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="key-outline"
              size={32}
              color={colors.accent}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t("codes.title")}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {t("codes.view_and_manage_all")}
            </Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={[styles.countText, { color: colors.textSecondary }]}>
              {allCodes.length}
            </Text>
          </View>
        </View>
      </ListCard>

      <ListCard onPress={handleAuditsPress}>
        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="clipboard-check-outline"
              size={32}
              color={colors.accent}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t("audits.title")}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {t("audits.view_and_manage_all")}
            </Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={[styles.countText, { color: colors.textSecondary }]}>
              {allAudits.length}
            </Text>
          </View>
        </View>
      </ListCard>

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
              {allInteractions.length}
            </Text>
          </View>
        </View>
      </ListCard>

      <ListCard onPress={handleSyncPress}>
        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="sync"
              size={32}
              color={colors.accent}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t("sync.title")}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {t("sync.description")}
            </Text>
          </View>
        </View>
      </ListCard>

      <ListCard onPress={handleSettingsPress}>
        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="cog-outline"
              size={32}
              color={colors.accent}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t("settings.title")}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {t("settings.description")}
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
  text: {
    fontSize: 16,
    textAlign: "center",
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
