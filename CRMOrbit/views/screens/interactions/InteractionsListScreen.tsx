import { useMemo } from "react";

import { useAllInteractions } from "../../store/store";
import type { Interaction } from "../../../domains/interaction";
import { ListRow, ListScreenLayout } from "../../components";
import { t } from "@i18n/index";

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
};

export const InteractionsListScreen = ({ navigation }: Props) => {
  const interactions = useAllInteractions();

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
        subtitle={t(item.type)}
        description={`${formattedDate} at ${formattedTime}`}
        showChevron
      />
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
