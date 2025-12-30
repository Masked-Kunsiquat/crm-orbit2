import { StyleSheet, Text } from "react-native";

import { ActionButton, Section } from "../components";
import { useOrganizationActions } from "../crm-core/hooks";
import { useOrganizations } from "../crm-core/views/store";

const DEVICE_ID = "device-local";

export const OrganizationsScreen = () => {
  const organizations = useOrganizations();
  const { createOrganization } = useOrganizationActions(DEVICE_ID);

  const handleAddOrganization = () => {
    createOrganization(`Organization ${organizations.length + 1}`);
  };

  return (
    <Section title="Organizations">
      <ActionButton label="Add organization" onPress={handleAddOrganization} />
      {organizations.length === 0 ? (
        <Text style={styles.empty}>No organizations yet.</Text>
      ) : (
        organizations.map((org) => (
          <Text key={org.id} style={styles.item}>
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
    color: "#2a2a2a",
  },
  empty: {
    fontSize: 13,
    color: "#7a7a7a",
    fontStyle: "italic",
  },
});
