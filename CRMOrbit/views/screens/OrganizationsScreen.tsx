import { StyleSheet, Text } from "react-native";

import { PrimaryActionButton, Section } from "@views/components";
import { useDeviceId, useOrganizationActions, useTheme } from "@views/hooks";
import { useOrganizations } from "@views/store/store";

export const OrganizationsScreen = () => {
  const organizations = useOrganizations();
  const deviceId = useDeviceId();
  const { createOrganization } = useOrganizationActions(deviceId);
  const { colors } = useTheme();

  const handleAddOrganization = () => {
    // Use entity ID as name (locale-neutral identifier)
    // In production, this would prompt the user for a name
    createOrganization(`org-${Date.now()}`);
  };

  return (
    <Section title="Organizations">
      <PrimaryActionButton
        label="Add organization"
        onPress={handleAddOrganization}
      />
      {organizations.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>
          No organizations yet.
        </Text>
      ) : (
        organizations.map((org) => (
          <Text
            key={org.id}
            style={[styles.item, { color: colors.textPrimary }]}
          >
            {org.name} ({org.status})
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
  },
  empty: {
    fontSize: 13,
    fontStyle: "italic",
  },
});
