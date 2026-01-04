import { StyleSheet, Text, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import type { MiscStackScreenProps } from "../../navigation/types";
import { ListCard } from "../../components";
import { useTheme } from "../../hooks";
import { t } from "@i18n/index";

type Props = MiscStackScreenProps<"SettingsList">;

export const SettingsListScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();

  const handleSecurityPress = () => {
    navigation.navigate("SecuritySettings");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
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
              {t("settings.security.title")}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {t("settings.security.description")}
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
