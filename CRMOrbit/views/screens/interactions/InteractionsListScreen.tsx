import { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons, FontAwesome6 } from "@expo/vector-icons";

import { useAllInteractions } from "../../store/store";
import type { Interaction } from "../../../domains/interaction";
import { ListRow, ListScreenLayout } from "../../components";
import { t } from "@i18n/index";
import { useTheme } from "../../hooks";

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
};

export const InteractionsListScreen = ({ navigation }: Props) => {
  const interactions = useAllInteractions();
  const { colors } = useTheme();

  const sortedInteractions = useMemo(() => {
    return [...interactions].sort((a, b) => {
      // Sort by occurredAt descending (most recent first)
      return (
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
      );
    });
  }, [interactions]);

  const handlePress = (interaction: Interaction) => {
    navigation.navigate("InteractionDetail", {
      interactionId: interaction.id,
    });
  };

  const handleAdd = () => {
    navigation.navigate("InteractionForm", {});
  };

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case "interaction.type.email":
        return (
          <Ionicons name="mail-outline" size={20} color={colors.accent} />
        );
      case "interaction.type.call":
        return (
          <Ionicons name="call-outline" size={20} color={colors.accent} />
        );
      case "interaction.type.meeting":
        return (
          <Ionicons
            name="people-circle-outline"
            size={20}
            color={colors.accent}
          />
        );
      case "interaction.type.other":
      default:
        return (
          <FontAwesome6 name="lines-leaning" size={20} color={colors.accent} />
        );
    }
  };

  const renderItem = ({ item }: { item: Interaction }) => {
    const occurredDate = new Date(item.occurredAt);
    const formattedDate = occurredDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const formattedTime = occurredDate.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });

    return (
      <ListRow
        onPress={() => handlePress(item)}
        title={item.summary}
        description={`${formattedDate} at ${formattedTime}`}
        style={styles.listRow}
      >
        <View style={styles.iconContainer}>{getInteractionIcon(item.type)}</View>
      </ListRow>
    );
  };

  return (
    <ListScreenLayout
      data={sortedInteractions}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      emptyTitle={t("interactions.emptyTitle")}
      emptyHint={t("interactions.emptyHint")}
      onAdd={handleAdd}
    />
  );
};

const styles = StyleSheet.create({
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconContainer: {
    marginLeft: 8,
  },
});
