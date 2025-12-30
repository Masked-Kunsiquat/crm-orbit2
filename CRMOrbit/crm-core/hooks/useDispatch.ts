import { useCallback, useState } from "react";

import { applyEvents, buildEvent } from "../events/dispatcher";
import type { Event } from "../events/event";
import { useCrmStore } from "../views/store";

type DispatchState = {
  isProcessing: boolean;
  lastError: string | null;
  lastEventType: string | null;
};

type DispatchResult = {
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

  const dispatch = useCallback(
    (newEvents: Event[]): DispatchResult => {
      if (newEvents.length === 0) {
        return { success: true };
      }

      setState({
        isProcessing: true,
        lastError: null,
        lastEventType: newEvents[newEvents.length - 1]?.type ?? null,
      });

      try {
        // Get current state directly from store
        const currentState = useCrmStore.getState();
        const nextDoc = applyEvents(currentState.doc, newEvents);

        currentState.setDoc(nextDoc);
        currentState.setEvents([...currentState.events, ...newEvents]);

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
    },
    [],
  );

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
    (type: string, entityId: string, payload: unknown): DispatchResult => {
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
