import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";

import { registerCoreReducers } from "./crm-core/events/dispatcher";
import { RootTabs } from "./navigation";

registerCoreReducers();

export default function App() {
  return (
    <NavigationContainer>
      <View style={styles.container}>
        <StatusBar style="auto" />
        <RootTabs />
      </View>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f2ee",
  },
});
