import { useCallback } from "react";

import { buildEvent } from "../../events/dispatcher";
import { nextId } from "../../domains/shared/idGenerator";
import type { EntityId } from "../../domains/shared/types";
import type { DispatchResult } from "./useDispatch";
import { useDispatch } from "./useDispatch";

/**
 * Actions for managing audits (as CalendarEvents with type="calendarEvent.type.audit")
 *
 * This hook provides all audit-related actions that dispatch CalendarEvent events.
 * Audits are stored as CalendarEvents with auditData containing account, score, and floors.
 */
export const useAuditActions = (deviceId: string) => {
  const { dispatch } = useDispatch();

  /**
   * Create a new audit
   * Creates a CalendarEvent with type="audit" and links to the account
   */
  const createAudit = useCallback(
    (
      accountId: EntityId,
      scheduledFor: string,
      durationMinutes: number,
      notes?: string,
      floorsVisited?: number[],
      auditId?: EntityId,
    ): DispatchResult => {
      const id = auditId ?? nextId("calendarEvent");
      const linkId = nextId("link");

      const event = buildEvent({
        type: "calendarEvent.scheduled",
        entityId: id,
        payload: {
          id,
          type: "calendarEvent.type.audit",
          summary: "", // Audits display account name, summary not needed
          scheduledFor,
          durationMinutes,
          accountId,
          ...(notes !== undefined && { description: notes }),
          // Link the audit to the account
          linkedEntities: [
            {
              linkId,
              entityType: "account",
              entityId: accountId,
            },
          ],
        },
        deviceId,
      });

      // If floorsVisited is provided, we need to update after creation
      // since the scheduled event doesn't support floorsVisited
      if (floorsVisited && floorsVisited.length > 0) {
        const updateEvent = buildEvent({
          type: "calendarEvent.updated",
          entityId: id,
          payload: {
            id,
            floorsVisited,
          },
          deviceId,
        });
        return dispatch([event, updateEvent]);
      }

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  /**
   * Reschedule an audit to a new date/time
   */
  const rescheduleAudit = useCallback(
    (auditId: EntityId, scheduledFor: string): DispatchResult => {
      const event = buildEvent({
        type: "calendarEvent.rescheduled",
        entityId: auditId,
        payload: {
          id: auditId,
          scheduledFor,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  /**
   * Mark an audit as completed with optional score and floors data
   */
  const completeAudit = useCallback(
    (
      auditId: EntityId,
      occurredAt: string,
      durationMinutes: number,
      score?: number,
      notes?: string,
      floorsVisited?: number[],
    ): DispatchResult => {
      // First update duration if needed (calendarEvent.completed doesn't include duration)
      const events = [];

      // Update duration and notes via update event
      const updateEvent = buildEvent({
        type: "calendarEvent.updated",
        entityId: auditId,
        payload: {
          id: auditId,
          durationMinutes,
          ...(notes !== undefined && { description: notes }),
        },
        deviceId,
      });
      events.push(updateEvent);

      // Then complete with audit-specific data
      const completeEvent = buildEvent({
        type: "calendarEvent.completed",
        entityId: auditId,
        payload: {
          id: auditId,
          occurredAt,
          ...(score !== undefined && { score }),
          ...(floorsVisited !== undefined && { floorsVisited }),
        },
        deviceId,
      });
      events.push(completeEvent);

      return dispatch(events);
    },
    [deviceId, dispatch],
  );

  /**
   * Update audit notes (stored as description on CalendarEvent)
   */
  const updateAuditNotes = useCallback(
    (auditId: EntityId, notes?: string): DispatchResult => {
      const event = buildEvent({
        type: "calendarEvent.updated",
        entityId: auditId,
        payload: {
          id: auditId,
          description: notes,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  /**
   * Update floors visited for an audit
   */
  const updateAuditFloorsVisited = useCallback(
    (auditId: EntityId, floorsVisited: number[]): DispatchResult => {
      const event = buildEvent({
        type: "calendarEvent.updated",
        entityId: auditId,
        payload: {
          id: auditId,
          floorsVisited,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  /**
   * Reassign audit to a different account
   * Updates auditData.accountId and recreates the entity link
   */
  const reassignAuditAccount = useCallback(
    (auditId: EntityId, accountId: EntityId): DispatchResult => {
      const event = buildEvent({
        type: "calendarEvent.updated",
        entityId: auditId,
        payload: {
          id: auditId,
          accountId, // This updates auditData.accountId via the reducer
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  /**
   * Delete an audit
   */
  const deleteAudit = useCallback(
    (auditId: EntityId): DispatchResult => {
      const event = buildEvent({
        type: "calendarEvent.deleted",
        entityId: auditId,
        payload: {
          id: auditId,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  /**
   * Cancel a scheduled audit
   */
  const cancelAudit = useCallback(
    (auditId: EntityId): DispatchResult => {
      const event = buildEvent({
        type: "calendarEvent.canceled",
        entityId: auditId,
        payload: {
          id: auditId,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  /**
   * Update audit duration
   */
  const updateAuditDuration = useCallback(
    (auditId: EntityId, durationMinutes: number): DispatchResult => {
      const event = buildEvent({
        type: "calendarEvent.updated",
        entityId: auditId,
        payload: {
          id: auditId,
          durationMinutes,
        },
        deviceId,
      });

      return dispatch([event]);
    },
    [deviceId, dispatch],
  );

  return {
    createAudit,
    rescheduleAudit,
    completeAudit,
    updateAuditNotes,
    updateAuditFloorsVisited,
    reassignAuditAccount,
    cancelAudit,
    updateAuditDuration,
    deleteAudit,
  };
};
