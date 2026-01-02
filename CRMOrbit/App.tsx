import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { registerCoreReducers } from "./events/dispatcher";
import {
  initializeDatabase,
  createPersistenceDb,
} from "./domains/persistence/database";
import { loadPersistedState } from "./domains/persistence/loader";
import { __internal_getCrmStore } from "./views/store/store";
import { RootStack } from "./views/navigation";

registerCoreReducers();

/**
 * Root React component that initializes persistence, hydrates the CRM store, and renders the app UI.
 *
 * On mount it initializes the local database and persistence layer, loads persisted state into the internal CRM store, and then renders either the navigation stack, a loading view while initialization is in progress, or an error view if initialization fails.
 *
 * @returns The root React element: the navigation stack when data is loaded, a loading indicator while initializing, or an error message view if initialization failed.
 */
export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Initialize database
        const db = await initializeDatabase();
        const persistenceDb = createPersistenceDb(db);

        // Load persisted state
        const { doc, events } = await loadPersistedState(persistenceDb);

        // Update store with loaded data
        const store = __internal_getCrmStore();
        store.getState().setDoc(doc);
        store.getState().setEvents(events);

        setIsLoading(false);
      } catch (err) {
        console.error("Failed to load data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Error loading data:</Text>
        <Text style={styles.errorMessage}>{error}</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#1f5eff" />
        <Text style={styles.loadingText}>Loading data...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <View style={styles.container}>
        <StatusBar style="auto" />
        <RootStack />
      </View>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f2ee",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#b00020",
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});