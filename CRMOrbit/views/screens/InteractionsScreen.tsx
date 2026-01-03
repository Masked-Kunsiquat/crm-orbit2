import { StyleSheet, Text } from "react-native";

import { PrimaryActionButton, Section } from "@views/components";
import { useDeviceId, useInteractionActions } from "@views/hooks";
import { useAllInteractions } from "@views/store/store";

export const InteractionsScreen = () => {
  const interactions = useAllInteractions();
  const deviceId = useDeviceId();
  const { logInteraction } = useInteractionActions(deviceId);

  const handleAddInteraction = () => {
    // Use timestamp-based identifier (locale-neutral)
    // In production, this would prompt the user for summary
    logInteraction("interaction.type.call", `interaction-${Date.now()}`);
  };

  return (
    <Section title="Interactions">
      <PrimaryActionButton
        label="Add interaction"
        onPress={handleAddInteraction}
      />
      {interactions.length === 0 ? (
        <Text style={styles.empty}>No interactions yet.</Text>
      ) : (
        interactions.map((interaction) => (
          <Text key={interaction.id} style={styles.item}>
            {interaction.type}: {interaction.summary}
          </Text>
        ))
      )}
    </Section>
  );
};

const styles = StyleSheet.create({
  item: {
    fontSize: 14,
    marginBottom: 6,
    color: "#2a2a2a",
  },
  empty: {
    fontSize: 13,
    color: "#7a7a7a",
    fontStyle: "italic",
  },
});
