import { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons, FontAwesome6 } from "@expo/vector-icons";

import { useAllInteractions } from "../../store/store";
import type { Interaction } from "../../../domains/interaction";
import { ListRow, ListScreenLayout } from "../../components";
import { t } from "@i18n/index";
import { useTheme } from "../../hooks";
import type { EventsStackScreenProps } from "../../navigation/types";

type Props = EventsStackScreenProps<"InteractionsList">;

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
        return <Ionicons name="mail-outline" size={20} color={colors.accent} />;
      case "interaction.type.call":
        return <Ionicons name="call-outline" size={20} color={colors.accent} />;
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
    const resolvedStatus = item.status ?? "interaction.status.completed";
    const usesScheduledTimestamp =
      resolvedStatus !== "interaction.status.completed";
    const timestampValue = usesScheduledTimestamp
      ? (item.scheduledFor ?? item.occurredAt)
      : item.occurredAt;
    const labelKey = usesScheduledTimestamp
      ? "interactions.scheduledFor"
      : "interactions.occurredAt";
    const formattedTimestamp = (() => {
      const date = new Date(timestampValue);
      if (Number.isNaN(date.getTime())) {
        return t("common.unknown");
      }
      return date.toLocaleString();
    })();
    const description =
      resolvedStatus === "interaction.status.completed"
        ? `${t(labelKey)}: ${formattedTimestamp}`
        : `${t("interactions.statusLabel")}: ${t(resolvedStatus)} · ${t(
            labelKey,
          )}: ${formattedTimestamp}`;

    return (
      <ListRow
        onPress={() => handlePress(item)}
        title={item.summary}
        description={description}
        style={styles.listRow}
      >
        <View style={styles.iconContainer}>
          {getInteractionIcon(item.type)}
        </View>
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
