import { useCallback } from "react";

import { buildEvent } from "../../events/dispatcher";
import { buildDeleteEntityEvent } from "@domains/actions";
import type {
  CalendarEventType,
  RecurrenceRule,
} from "../../domains/calendarEvent";
import type { EntityLinkType } from "../../domains/relations/entityLink";
import { nextId } from "../../domains/shared/idGenerator";
import type { EntityId } from "../../domains/shared/types";
import type { DispatchResult } from "./useDispatch";
import { useDispatch } from "./useDispatch";

export const useCalendarEventActions = (deviceId: string) => {
  const { dispatch } = useDispatch();

  /**
   * Schedule a new calendar event
   * For audits: accountId is required
   * For other types: linkedEntities can be provided
   */
  const scheduleCalendarEvent = useCallback(
    (
      type: CalendarEventType,
      summary: string,
      scheduledFor: string,
      options?: {
        durationMinutes?: number;
        description?: string;
        location?: string;
        accountId?: EntityId; // Required for type='audit'
        linkedEntities?: Array<{
          entityType: EntityLinkType;
          entityId: EntityId;
        }>;
        recurrenceRule?: RecurrenceRule;
        calendarEventId?: EntityId;
      },
    ): DispatchResult => {
      const id = options?.calendarEventId ?? nextId("calendarEvent");
      const event = buildEvent({
        type: "calendarEvent.scheduled",
        entityId: id,
        payload: {
          id,
          type,
          summary,
          scheduledFor,
          ...(options?.durationMinutes !== undefined && {
            durationMinutes: options.durationMinutes,
          }),
          ...(options?.description && { description: options.description }),
          ...(options?.location && { location: options.location }),
          ...(options?.accountId && { accountId: options.accountId }),
          ...(options?.linkedEntities && {
            linkedEntities: options.linkedEntities,
          }),
          ...(options?.recurrenceRule && {
            recurrenceRule: options.recurrenceRule,
          }),
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  /**
   * Update calendar event fields
   * Does not change scheduledFor (use reschedule) or status (use complete/cancel)
   */
  const updateCalendarEvent = useCallback(
    (
      calendarEventId: EntityId,
      updates: {
        type?: CalendarEventType;
        summary?: string;
        description?: string;
        durationMinutes?: number;
        location?: string;
      },
    ): DispatchResult => {
      const event = buildEvent({
        type: "calendarEvent.updated",
        entityId: calendarEventId,
        payload: {
          id: calendarEventId,
          ...updates,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  /**
   * Mark calendar event as completed
   * For audits: can include score and floorsVisited
   */
  const completeCalendarEvent = useCallback(
    (
      calendarEventId: EntityId,
      occurredAt: string,
      options?: {
        score?: number; // For audits
        floorsVisited?: number[]; // For audits
        description?: string; // Completion notes
      },
    ): DispatchResult => {
      const event = buildEvent({
        type: "calendarEvent.completed",
        entityId: calendarEventId,
        payload: {
          id: calendarEventId,
          occurredAt,
          ...(options?.score !== undefined && { score: options.score }),
          ...(options?.floorsVisited && {
            floorsVisited: options.floorsVisited,
          }),
          ...(options?.description && { description: options.description }),
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  /**
   * Cancel calendar event
   */
  const cancelCalendarEvent = useCallback(
    (calendarEventId: EntityId): DispatchResult => {
      const event = buildEvent({
        type: "calendarEvent.canceled",
        entityId: calendarEventId,
        payload: {
          id: calendarEventId,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  /**
   * Reschedule calendar event to new time
   */
  const rescheduleCalendarEvent = useCallback(
    (
      calendarEventId: EntityId,
      scheduledFor: string,
      applyToSeries?: boolean,
    ): DispatchResult => {
      const event = buildEvent({
        type: "calendarEvent.rescheduled",
        entityId: calendarEventId,
        payload: {
          id: calendarEventId,
          scheduledFor,
          ...(applyToSeries !== undefined && { applyToSeries }),
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  /**
   * Delete calendar event and all entity links
   */
  const deleteCalendarEvent = useCallback(
    (
      calendarEventId: EntityId,
      deleteEntireSeries?: boolean,
    ): DispatchResult => {
      const event = buildDeleteEntityEvent(
        "calendarEvent.deleted",
        calendarEventId,
        deviceId,
        {
          ...(deleteEntireSeries !== undefined && { deleteEntireSeries }),
        },
      );

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  /**
   * Link calendar event to an entity
   */
  const linkCalendarEvent = useCallback(
    (
      calendarEventId: EntityId,
      entityType: EntityLinkType,
      entityId: EntityId,
    ): DispatchResult => {
      const event = buildEvent({
        type: "calendarEvent.linked",
        entityId: calendarEventId,
        payload: {
          calendarEventId,
          entityType,
          entityId,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  /**
   * Unlink calendar event from an entity
   */
  const unlinkCalendarEvent = useCallback(
    (
      linkId: EntityId,
      calendarEventId?: EntityId,
      entityType?: EntityLinkType,
      entityId?: EntityId,
    ): DispatchResult => {
      const event = buildEvent({
        type: "calendarEvent.unlinked",
        entityId: calendarEventId,
        payload: {
          linkId,
          ...(calendarEventId && { calendarEventId }),
          ...(entityType && { entityType }),
          ...(entityId && { entityId }),
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  /**
   * Add recurrence rule to calendar event
   */
  const addRecurrenceRule = useCallback(
    (
      calendarEventId: EntityId,
      recurrenceRule: RecurrenceRule,
    ): DispatchResult => {
      const event = buildEvent({
        type: "calendarEvent.recurrence.created",
        entityId: calendarEventId,
        payload: {
          id: calendarEventId,
          recurrenceRule,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  /**
   * Update recurrence rule
   */
  const updateRecurrenceRule = useCallback(
    (
      calendarEventId: EntityId,
      recurrenceRule: RecurrenceRule,
    ): DispatchResult => {
      const event = buildEvent({
        type: "calendarEvent.recurrence.updated",
        entityId: calendarEventId,
        payload: {
          id: calendarEventId,
          recurrenceRule,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  /**
   * Remove recurrence rule from calendar event
   */
  const deleteRecurrenceRule = useCallback(
    (calendarEventId: EntityId): DispatchResult => {
      const event = buildEvent({
        type: "calendarEvent.recurrence.deleted",
        entityId: calendarEventId,
        payload: {
          id: calendarEventId,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  return {
    scheduleCalendarEvent,
    updateCalendarEvent,
    completeCalendarEvent,
    cancelCalendarEvent,
    rescheduleCalendarEvent,
    deleteCalendarEvent,
    linkCalendarEvent,
    unlinkCalendarEvent,
    addRecurrenceRule,
    updateRecurrenceRule,
    deleteRecurrenceRule,
  };
};
