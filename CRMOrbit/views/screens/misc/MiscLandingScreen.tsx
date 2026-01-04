import { StyleSheet, Text, View } from "react-native";

import type { MiscStackScreenProps } from "../../navigation/types";
import { useTheme } from "../../hooks";

type Props = MiscStackScreenProps<"MiscLanding">;

export const MiscLandingScreen = ({ navigation: _navigation }: Props) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        Future home of Codes and other utilities
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 16,
    textAlign: "center",
  },
});
