import { StyleSheet, Text, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import type { MiscStackScreenProps } from "../../navigation/types";
import { ListCard } from "../../components";
import { useSettingsListLabels, useTheme } from "../../hooks";

type Props = MiscStackScreenProps<"SettingsList">;

export const SettingsListScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const labels = useSettingsListLabels();

  const handleSecurityPress = () => {
    navigation.navigate("SecuritySettings");
  };

  const handleCalendarPress = () => {
    navigation.navigate("CalendarSettings");
  };

  const handleAppearancePress = () => {
    navigation.navigate("AppearanceSettings");
  };

  const handleBackupPress = () => {
    navigation.navigate("BackupSettings");
  };

  const handleSyncPress = () => {
    navigation.navigate("Sync");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <ListCard onPress={handleAppearancePress}>
        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="palette"
              size={32}
              color={colors.accent}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {labels.appearanceTitle}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {labels.appearanceDescription}
            </Text>
          </View>
        </View>
      </ListCard>

      <ListCard onPress={handleBackupPress}>
        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="database"
              size={32}
              color={colors.accent}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {labels.backupTitle}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {labels.backupDescription}
            </Text>
          </View>
        </View>
      </ListCard>

      <ListCard onPress={handleCalendarPress}>
        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="calendar-sync"
              size={32}
              color={colors.accent}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {labels.calendarTitle}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {labels.calendarDescription}
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
              {labels.syncTitle}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {labels.syncDescription}
            </Text>
          </View>
        </View>
      </ListCard>

      <ListCard onPress={handleSecurityPress}>
        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="shield-lock-outline"
              size={32}
              color={colors.accent}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {labels.securityTitle}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {labels.securityDescription}
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
});
