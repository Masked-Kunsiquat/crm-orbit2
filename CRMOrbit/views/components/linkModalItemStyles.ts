import { StyleSheet } from "react-native";

/**
 * Shared styles for link modal item content.
 * These styles are used within the item TouchableOpacity rendered by BaseLinkModal.
 */
export const linkModalItemStyles = StyleSheet.create({
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 6,
  },
  itemBody: {
    fontSize: 13,
  },
  itemType: {
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: "600",
    marginBottom: 4,
  },
  itemSummary: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 6,
  },
  itemMeta: {
    fontSize: 12,
  },
});
