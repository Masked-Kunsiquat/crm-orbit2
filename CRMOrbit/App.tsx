import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { applyEvents, buildEvent, registerCoreReducers } from "./events/dispatcher";
import {
  initializeDatabase,
  createPersistenceDb,
} from "./domains/persistence/database";
import { loadLatestDeviceId } from "./domains/persistence/deviceId";
import { loadPersistedState } from "./domains/persistence/loader";
import { appendEvents } from "./domains/persistence/store";
import { buildCodeEncryptionEvents } from "./domains/migrations/codeEncryption";
import { __internal_getCrmStore } from "./views/store/store";
import { RootStack } from "./views/navigation";
import { getDeviceIdFromEnv, setDeviceId, useTheme } from "./views/hooks";
import { nextId } from "./domains/shared/idGenerator";

registerCoreReducers();

/**
 * Root application component that initializes persistence, hydrates the CRM store, and renders navigation or an error/loading UI.
 *
 * Initializes the local database and persistence layer on mount, loads persisted state into the internal CRM store, and displays either the app navigation once ready, a loading indicator while initializing, or an error message if initialization fails.
 *
 * @returns The root React element for the app; renders the navigation stack when data is loaded, or a loading/error screen otherwise.
 */
export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { colors } = useTheme();

  useEffect(() => {
    const loadData = async () => {
      try {
        // Initialize database
        const persistenceDb = await initializeDatabase();
        const storeDb = createPersistenceDb(persistenceDb);

        let activeDeviceId = "";
        const envDeviceId = getDeviceIdFromEnv();
        if (envDeviceId) {
          setDeviceId(envDeviceId);
          activeDeviceId = envDeviceId;
        } else {
          const resolvedDeviceId = await loadLatestDeviceId(persistenceDb);
          if (resolvedDeviceId) {
            setDeviceId(resolvedDeviceId);
            activeDeviceId = resolvedDeviceId;
          } else {
            const generatedId = nextId("device");
            setDeviceId(generatedId);
            activeDeviceId = generatedId;
            const deviceEvent = buildEvent({
              type: "device.registered",
              entityId: generatedId,
              payload: {
                deviceId: generatedId,
              },
              deviceId: generatedId,
            });
            await appendEvents(storeDb, [deviceEvent]);
          }
        }

        // Load persisted state
        const { doc: loadedDoc, events: loadedEvents } =
          await loadPersistedState(storeDb);

        const migrationEvents = await buildCodeEncryptionEvents(
          loadedDoc,
          activeDeviceId,
        );

        let doc = loadedDoc;
        let events = loadedEvents;

        if (migrationEvents.length > 0) {
          await appendEvents(storeDb, migrationEvents);
          doc = applyEvents(loadedDoc, migrationEvents);
          events = [...loadedEvents, ...migrationEvents];
        }

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
      <View style={[styles.centered, { backgroundColor: colors.canvas }]}>
        <Text style={[styles.errorText, { color: colors.textPrimary }]}>
          Error loading data:
        </Text>
        <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
          {error}
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.canvas }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading data...
        </Text>
      </View>
    );
  }

  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.canvas,
    },
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <NavigationContainer theme={navTheme}>
        <View style={[styles.container, { backgroundColor: colors.canvas }]}>
          <StatusBar style="auto" />
          <RootStack />
        </View>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: "center",
  },
});
