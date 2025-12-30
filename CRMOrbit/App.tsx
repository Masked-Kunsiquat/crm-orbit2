import { StatusBar } from "expo-status-bar";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { registerCoreReducers } from "./crm-core/events/dispatcher";
import { useDispatch } from "./crm-core/hooks";
import {
  OrganizationsScreen,
  AccountsScreen,
  ContactsScreen,
  NotesScreen,
  InteractionsScreen,
} from "./screens";

registerCoreReducers();

export default function App() {
  const { isProcessing, lastError, lastEventType, clearError } = useDispatch();

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>CRM Orbit</Text>
          <Text style={styles.subtitle}>Offline-first CRM</Text>
          {isProcessing ? (
            <Text style={styles.processing}>Processing events...</Text>
          ) : null}
          {lastEventType ? (
            <Text style={styles.meta}>Last event: {lastEventType}</Text>
          ) : null}
          {lastError ? (
            <View>
              <Text style={styles.error}>{lastError}</Text>
              <Text style={styles.errorDismiss} onPress={clearError}>
                Dismiss
              </Text>
            </View>
          ) : null}
        </View>

        <OrganizationsScreen />
        <AccountsScreen />
        <ContactsScreen />
        <NotesScreen />
        <InteractionsScreen />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f2ee",
  },
  scroll: {
    padding: 20,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1b1b1b",
  },
  subtitle: {
    fontSize: 14,
    color: "#5b5b5b",
    marginTop: 4,
  },
  processing: {
    marginTop: 8,
    color: "#8b5a2b",
    fontWeight: "600",
  },
  meta: {
    marginTop: 6,
    color: "#4a4a4a",
    fontSize: 12,
  },
  error: {
    marginTop: 8,
    color: "#b00020",
  },
  errorDismiss: {
    marginTop: 4,
    color: "#1f5eff",
    fontSize: 12,
    textDecorationLine: "underline",
  },
});
