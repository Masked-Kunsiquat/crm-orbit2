import { useCallback, useState } from "react";

import { applyEvents, buildEvent } from "@events/dispatcher";
import type { Event } from "@events/event";
import type { EventType } from "@events/eventTypes";
import { __internal_getCrmStore } from "@views/store/store";
import {
  getDatabase,
  createPersistenceDb,
} from "@domains/persistence/database";
import { appendEvents } from "@domains/persistence/store";

type DispatchState = {
  isProcessing: boolean;
  lastError: string | null;
  lastEventType: string | null;
};

export type DispatchResult = {
  success: boolean;
  error?: string;
};

/**
 * Hook for dispatching events to the CRM store.
 * Provides optimistic UI feedback during event processing.
 *
 * @returns Dispatch function and state for UI feedback
 */
export const useDispatch = () => {
  const [state, setState] = useState<DispatchState>({
    isProcessing: false,
    lastError: null,
    lastEventType: null,
  });

  const dispatch = useCallback((newEvents: Event[]): DispatchResult => {
    if (newEvents.length === 0) {
      return { success: true };
    }

    setState({
      isProcessing: true,
      lastError: null,
      lastEventType: newEvents[newEvents.length - 1]?.type ?? null,
    });

    try {
      // Use functional setters to handle rapid dispatches correctly
      const store = __internal_getCrmStore().getState();

      // Apply events to the latest doc state
      store.setDoc((currentDoc) => applyEvents(currentDoc, newEvents));
      store.setEvents((prevEvents) => [...prevEvents, ...newEvents]);

      // Persist events to database (async, non-blocking)
      (async () => {
        try {
          const db = getDatabase();
          const persistenceDb = createPersistenceDb(db);
          console.log("Persisting events to database:", newEvents.map(e => ({ type: e.type, entityId: e.entityId })));
          await appendEvents(persistenceDb, newEvents);
          console.log("Successfully persisted events to database");
        } catch (persistError) {
          console.error("Failed to persist events:", persistError);
          console.error("Event details:", newEvents);
          // Optionally alert user of persistence failure
          console.warn("CRITICAL: Events were applied to memory but NOT saved to database!");
        }
      })();

      // Keep processing state visible briefly for user feedback
      setTimeout(() => {
        setState((prev) => ({ ...prev, isProcessing: false }));
      }, 250);

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      setState({
        isProcessing: false,
        lastError: errorMessage,
        lastEventType: newEvents[newEvents.length - 1]?.type ?? null,
      });

      return { success: false, error: errorMessage };
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, lastError: null }));
  }, []);

  return {
    dispatch,
    clearError,
    isProcessing: state.isProcessing,
    lastError: state.lastError,
    lastEventType: state.lastEventType,
  };
};

/**
 * Hook for building and dispatching a single event.
 *
 * @param deviceId - The device identifier for event attribution
 * @returns Function to build and dispatch an event
 */
export const useEventBuilder = (deviceId: string) => {
  const { dispatch } = useDispatch();

  const buildAndDispatch = useCallback(
    (type: EventType, entityId: string, payload: unknown): DispatchResult => {
      const event = buildEvent({
        type,
        entityId,
        payload,
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  return buildAndDispatch;
};
