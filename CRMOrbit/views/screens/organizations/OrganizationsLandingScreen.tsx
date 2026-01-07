import { StyleSheet, Text, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import type { OrganizationsStackScreenProps } from "../../navigation/types";
import { ListCard } from "../../components";
import { useTheme } from "../../hooks";
import { t } from "@i18n/index";
import {
  useAccounts,
  useOrganizations,
  useOrganizationsLandingLabels,
} from "../../store/store";

type Props = OrganizationsStackScreenProps<"OrganizationsLanding">;

export const OrganizationsLandingScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const accounts = useAccounts();
  const organizations = useOrganizations();
  const {
    accountsLabelKey,
    accountsSubtitleKey,
    organizationsLabelKey,
    organizationsSubtitleKey,
  } = useOrganizationsLandingLabels();

  const handleAccountsPress = () => {
    navigation.navigate("AccountsList");
  };

  const handleOrganizationsPress = () => {
    navigation.navigate("OrganizationsList");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <ListCard onPress={handleAccountsPress}>
        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="home-city-outline"
              size={32}
              color={colors.accent}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t(accountsLabelKey)}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {t(accountsSubtitleKey)}
            </Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={[styles.countText, { color: colors.textSecondary }]}>
              {accounts.length}
            </Text>
          </View>
        </View>
      </ListCard>

      <ListCard onPress={handleOrganizationsPress}>
        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="office-building-outline"
              size={32}
              color={colors.accent}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t(organizationsLabelKey)}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {t(organizationsSubtitleKey)}
            </Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={[styles.countText, { color: colors.textSecondary }]}>
              {organizations.length}
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
