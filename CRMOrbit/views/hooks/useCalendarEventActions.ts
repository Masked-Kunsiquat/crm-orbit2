import { useCallback } from "react";

import { buildEvent } from "../../events/dispatcher";
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
          linkId?: EntityId;
          entityType: EntityLinkType;
          entityId: EntityId;
        }>;
        recurrenceRule?: RecurrenceRule;
        calendarEventId?: EntityId;
      },
    ): DispatchResult => {
      const id = options?.calendarEventId ?? nextId("calendarEvent");
      const resolvedLinkedEntities = options?.linkedEntities
        ? options.linkedEntities.map((link) => ({
            linkId: link.linkId ?? nextId("link"),
            entityType: link.entityType,
            entityId: link.entityId,
          }))
        : undefined;
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
          ...(resolvedLinkedEntities && {
            linkedEntities: resolvedLinkedEntities,
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
        auditData?: {
          accountId?: EntityId;
          score?: number;
          floorsVisited?: number[];
        };
      },
    ): DispatchResult => {
      const { auditData, ...fields } = updates;
      const event = buildEvent({
        type: "calendarEvent.updated",
        entityId: calendarEventId,
        payload: {
          id: calendarEventId,
          ...fields,
          ...(auditData?.accountId && { accountId: auditData.accountId }),
          ...(auditData?.score !== undefined && { score: auditData.score }),
          ...(auditData?.floorsVisited !== undefined && {
            floorsVisited: auditData.floorsVisited,
          }),
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
        accountId?: EntityId;
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
          ...(options?.accountId && { accountId: options.accountId }),
          ...(options?.score !== undefined && { score: options.score }),
          ...(options?.floorsVisited !== undefined && {
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
    (
      calendarEventId: EntityId,
      options?: {
        accountId?: EntityId;
        score?: number;
        floorsVisited?: number[];
      },
    ): DispatchResult => {
      const event = buildEvent({
        type: "calendarEvent.canceled",
        entityId: calendarEventId,
        payload: {
          id: calendarEventId,
          ...(options?.accountId && { accountId: options.accountId }),
          ...(options?.score !== undefined && { score: options.score }),
          ...(options?.floorsVisited !== undefined && {
            floorsVisited: options.floorsVisited,
          }),
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
      const event = buildEvent({
        type: "calendarEvent.deleted",
        entityId: calendarEventId,
        payload: {
          id: calendarEventId,
          ...(deleteEntireSeries !== undefined && { deleteEntireSeries }),
        },
        deviceId,
      });

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
      const linkId = nextId("link");
      const event = buildEvent({
        type: "calendarEvent.linked",
        entityId: calendarEventId,
        payload: {
          linkId,
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
        ...(calendarEventId && { entityId: calendarEventId }),
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
