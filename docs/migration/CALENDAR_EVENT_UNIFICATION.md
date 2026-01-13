# Calendar Event Unification Migration

**Status**: Planning
**Created**: 2026-01-13
**Goal**: Unify `Interaction` and `Audit` entities into a single `CalendarEvent` model while preserving event-sourcing architecture and offline-first sync.

---

## Executive Summary

### Current State Problems
1. **Dual entity model**: `Interaction` and `Audit` are separate entities representing the same concept (time-based events)
2. **Confusing timestamp semantics**: Different handling of `scheduledFor` vs `occurredAt` between entity types
3. **Manual calendar sync**: Device calendar integration requires manual triggering
4. **No recurring events**: Cannot create repeating events (weekly meetings, monthly audits, etc.)

### Proposed Solution
Merge `Interaction` and `Audit` into a unified `CalendarEvent` entity with:
- Single event type enum covering all event kinds (meeting, call, email, audit, etc.)
- Consistent timestamp handling for scheduled vs occurred
- Standard recurrence rules (RRULE support)
- Automatic device calendar synchronization
- Preserve event-sourcing + Automerge CRDT architecture

### Migration Scope
- **Data Model**: Create new `CalendarEvent` entity, deprecate `Interaction` and `Audit`
- **Event System**: Add new event types for unified calendar events
- **Reducers**: Create calendar event reducers, maintain backward compatibility
- **State Management**: Add calendar event hooks and selectors
- **UI Components**: Refactor all calendar/interaction/audit views to use unified model
- **Persistence**: Add migration to transform existing data
- **Device Sync**: Implement automatic calendar synchronization

---

## Phase 1: Data Model Design

### 1.1 New `CalendarEvent` Entity

**File**: `CRMOrbit/domains/calendarEvent.ts`

```typescript
import { Entity, EntityId, Timestamp } from './shared/types';

export type CalendarEventType =
  // Interactions (migrated from Interaction.type)
  | 'meeting'
  | 'call'
  | 'email'
  | 'other'
  // Audits (migrated from Audit entity)
  | 'audit'
  // Future extensibility
  | 'task'
  | 'reminder';

export type CalendarEventStatus =
  | 'scheduled'
  | 'completed'
  | 'canceled';

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;              // Every N days/weeks/months/years
  until?: Timestamp;             // End date
  count?: number;                // Or end after N occurrences
  byWeekDay?: number[];          // For weekly: [0=Sun, 1=Mon, ...]
  byMonthDay?: number[];         // For monthly: [1-31]
}

export interface CalendarEvent extends Entity {
  // Core fields
  type: CalendarEventType;
  status: CalendarEventStatus;
  summary: string;               // Brief description
  description?: string;          // Detailed notes (optional)

  // Timing
  scheduledFor: Timestamp;       // When it's planned (always required)
  occurredAt?: Timestamp;        // When it actually happened (for completed events)
  durationMinutes?: number;      // Event duration

  // Recurrence
  recurrenceRule?: RecurrenceRule;
  recurrenceId?: EntityId;       // Links to parent event if this is a recurrence instance

  // Audit-specific fields (only populated for type='audit')
  auditData?: {
    score?: number;              // Audit score (0-100)
    floorsVisited?: number[];    // Which floors inspected
  };

  // Future extensibility
  location?: string;
  reminders?: {
    minutesBefore: number;
    notified: boolean;
  }[];
}
```

**Key Design Decisions**:
- `scheduledFor` is ALWAYS set (even for completed events, represents original schedule)
- `occurredAt` is ONLY set when status = 'completed' (when it actually happened)
- Audit-specific fields nested in `auditData` to keep model clean
- Recurrence support via `recurrenceRule` + `recurrenceId` for instances
- Type can be extended without breaking changes

### 1.2 Entity Linking Updates

**File**: `CRMOrbit/domains/relations/entityLink.ts`

```typescript
export type EntityLinkSourceType =
  | "note"
  | "interaction"     // DEPRECATED - keep for backward compatibility
  | "calendarEvent";  // NEW

export interface EntityLink {
  linkType: EntityLinkSourceType;

  // Legacy fields (maintain for backward compat)
  noteId?: EntityId;
  interactionId?: EntityId;

  // New field
  calendarEventId?: EntityId;

  // Target entity
  entityType: EntityLinkType;
  entityId: EntityId;
}
```

**Migration Strategy**:
- Keep `interactionId` field for existing links
- New links use `calendarEventId`
- Migration script will populate `calendarEventId` from `interactionId`

### 1.3 IMPORTANT: Audit Frequency vs Event Recurrence

**Critical Distinction**:
- **Audit Frequency** (Account-level): Contractual compliance requirement (monthly/bimonthly/quarterly/triannually)
  - Defined on `Account.auditFrequency` field
  - Used for compliance tracking ("Is this account overdue for an audit?")
  - Managed by `auditSchedule.ts` utilities
  - **NOT replaced by CalendarEvent recurrence**

- **Event Recurrence** (CalendarEvent-level): Repeating calendar events (e.g., "weekly meeting every Tuesday")
  - Optional `RecurrenceRule` on `CalendarEvent`
  - For actual repeating events that appear on calendar
  - **Separate concept from audit frequency**

**Audit Compliance System Preserved**:
```typescript
// Account entity still tracks contractual audit frequency
interface Account {
  auditFrequency: AccountAuditFrequency; // monthly | bimonthly | quarterly | triannually
  auditFrequencyUpdatedAt: Timestamp;
  auditFrequencyAnchorAt: Timestamp;
  // ... existing audit frequency logic stays intact
}

// CalendarEvent for individual audits links to account
interface CalendarEvent {
  type: 'audit';
  auditData: {
    accountId: EntityId; // Links to account with frequency
    score?: number;
    floorsVisited?: number[];
  };
  // recurrenceRule is OPTIONAL and separate from account's audit frequency
  recurrenceRule?: RecurrenceRule;
}
```

**Key Files Unchanged**:
- `domains/account.utils.ts` - Audit frequency calculation logic
- `views/utils/auditSchedule.ts` - Compliance tracking (ok/due/missing/overdue)
- Account audit frequency fields and reducer logic

### 1.4 Updated Automerge Schema

**File**: `CRMOrbit/automerge/schema.ts`

```typescript
export interface AutomergeDoc {
  // Existing entities
  organizations: Record<EntityId, Organization>;
  accounts: Record<EntityId, Account>;
  audits: Record<EntityId, Audit>;                     // DEPRECATED - maintain for migration
  contacts: Record<EntityId, Contact>;
  notes: Record<EntityId, Note>;
  interactions: Record<EntityId, Interaction>;         // DEPRECATED - maintain for migration
  codes: Record<EntityId, Code>;
  settings: Settings;

  // NEW unified calendar events
  calendarEvents: Record<EntityId, CalendarEvent>;

  relations: {
    accountContacts: Record<EntityId, AccountContact>;
    accountCodes: Record<EntityId, AccountCode>;
    entityLinks: Record<EntityId, EntityLink>;
  };
}
```

**Backward Compatibility Plan**:
- Keep deprecated `interactions` and `audits` fields during transition
- Migration phase: populate both old and new fields
- After full migration: remove deprecated fields in major version bump

---

## Phase 2: Event System

### 2.1 New Event Types

**File**: `CRMOrbit/events/eventTypes.ts`

```typescript
// New unified calendar event types
export const CalendarEventTypes = {
  // CRUD operations
  SCHEDULED: "calendarEvent.scheduled",
  UPDATED: "calendarEvent.updated",
  COMPLETED: "calendarEvent.completed",
  CANCELED: "calendarEvent.canceled",
  RESCHEDULED: "calendarEvent.rescheduled",
  DELETED: "calendarEvent.deleted",

  // Linking
  LINKED: "calendarEvent.linked",
  UNLINKED: "calendarEvent.unlinked",

  // Recurrence
  RECURRENCE_CREATED: "calendarEvent.recurrence.created",
  RECURRENCE_UPDATED: "calendarEvent.recurrence.updated",
  RECURRENCE_INSTANCE_UPDATED: "calendarEvent.recurrence.instance.updated",
} as const;

// Legacy event types (maintain for backward compat during migration)
export const InteractionTypes = {
  LOGGED: "interaction.logged",
  SCHEDULED: "interaction.scheduled",
  // ... keep existing types
} as const;
```

### 2.2 Event Payloads

```typescript
// calendarEvent.scheduled
export interface CalendarEventScheduledPayload {
  calendarEvent: CalendarEvent;
  linkedEntities?: {
    entityType: EntityLinkType;
    entityId: EntityId;
  }[];
}

// calendarEvent.completed
export interface CalendarEventCompletedPayload {
  calendarEventId: EntityId;
  occurredAt: Timestamp;
  score?: number;              // For audits
  floorsVisited?: number[];    // For audits
  description?: string;        // Optional notes
}

// calendarEvent.rescheduled
export interface CalendarEventRescheduledPayload {
  calendarEventId: EntityId;
  newScheduledFor: Timestamp;
  applyToSeries?: boolean;     // For recurring events
}

// calendarEvent.recurrence.created
export interface CalendarEventRecurrenceCreatedPayload {
  calendarEventId: EntityId;
  recurrenceRule: RecurrenceRule;
}
```

---

## Phase 3: Reducers

### 3.1 Calendar Event Reducer

**File**: `CRMOrbit/reducers/calendarEvent.reducer.ts`

```typescript
import { AutomergeDoc } from '../automerge/schema';
import { Event } from '../events/event';
import { CalendarEvent } from '../domains/calendarEvent';

export const calendarEventReducer = (
  doc: AutomergeDoc,
  event: Event
): AutomergeDoc => {
  switch (event.type) {
    case "calendarEvent.scheduled":
      return applyCalendarEventScheduled(doc, event);

    case "calendarEvent.updated":
      return applyCalendarEventUpdated(doc, event);

    case "calendarEvent.completed":
      return applyCalendarEventCompleted(doc, event);

    case "calendarEvent.canceled":
      return applyCalendarEventCanceled(doc, event);

    case "calendarEvent.rescheduled":
      return applyCalendarEventRescheduled(doc, event);

    case "calendarEvent.deleted":
      return applyCalendarEventDeleted(doc, event);

    case "calendarEvent.linked":
      return applyCalendarEventLinked(doc, event);

    case "calendarEvent.unlinked":
      return applyCalendarEventUnlinked(doc, event);

    case "calendarEvent.recurrence.created":
      return applyRecurrenceCreated(doc, event);

    case "calendarEvent.recurrence.updated":
      return applyRecurrenceUpdated(doc, event);

    case "calendarEvent.recurrence.instance.updated":
      return applyRecurrenceInstanceUpdated(doc, event);

    default:
      return doc;
  }
};

// Example implementation
function applyCalendarEventScheduled(
  doc: AutomergeDoc,
  event: Event
): AutomergeDoc {
  const payload = event.payload as CalendarEventScheduledPayload;

  // Add to calendarEvents collection
  doc.calendarEvents[payload.calendarEvent.id] = payload.calendarEvent;

  // Create entity links if provided
  if (payload.linkedEntities) {
    payload.linkedEntities.forEach(link => {
      const linkId = generateEntityId();
      doc.relations.entityLinks[linkId] = {
        linkType: "calendarEvent",
        calendarEventId: payload.calendarEvent.id,
        entityType: link.entityType,
        entityId: link.entityId,
      };
    });
  }

  return doc;
}

function applyCalendarEventCompleted(
  doc: AutomergeDoc,
  event: Event
): AutomergeDoc {
  const payload = event.payload as CalendarEventCompletedPayload;
  const calendarEvent = doc.calendarEvents[payload.calendarEventId];

  if (!calendarEvent) return doc;

  calendarEvent.status = 'completed';
  calendarEvent.occurredAt = payload.occurredAt;

  // Update audit-specific data if applicable
  if (calendarEvent.type === 'audit') {
    calendarEvent.auditData = {
      score: payload.score,
      floorsVisited: payload.floorsVisited,
    };
  }

  if (payload.description) {
    calendarEvent.description = payload.description;
  }

  return doc;
}
```

**Required Reducer Functions**:
- `applyCalendarEventScheduled` - Create new event
- `applyCalendarEventUpdated` - Update fields
- `applyCalendarEventCompleted` - Mark complete + set occurredAt
- `applyCalendarEventCanceled` - Set status to canceled
- `applyCalendarEventRescheduled` - Update scheduledFor
- `applyCalendarEventDeleted` - Remove event + links
- `applyCalendarEventLinked` - Create entity link
- `applyCalendarEventUnlinked` - Remove entity link
- `applyRecurrenceCreated` - Add recurrence rule
- `applyRecurrenceUpdated` - Modify recurrence rule
- `applyRecurrenceInstanceUpdated` - Update single instance of recurring event

### 3.2 Update Main Reducer

**File**: `CRMOrbit/automerge/applyEvent.ts`

```typescript
import { calendarEventReducer } from '../reducers/calendarEvent.reducer';

export const applyEvent = (doc: AutomergeDoc, event: Event): AutomergeDoc => {
  // ... existing reducers

  // Add calendar event reducer
  if (event.type.startsWith('calendarEvent.')) {
    return calendarEventReducer(doc, event);
  }

  // Keep legacy reducers for backward compatibility during migration
  if (event.type.startsWith('interaction.')) {
    return interactionReducer(doc, event);
  }

  if (event.type.startsWith('audit.')) {
    return auditReducer(doc, event);
  }

  // ... rest of reducers
};
```

---

## Phase 4: State Management

### 4.1 Selectors

**File**: `CRMOrbit/views/store/selectors.ts`

```typescript
// Get all calendar events
export const getAllCalendarEvents = (doc: AutomergeDoc): CalendarEvent[] => {
  return Object.values(doc.calendarEvents);
};

// Get single calendar event
export const getCalendarEvent = (
  doc: AutomergeDoc,
  id: EntityId
): CalendarEvent | undefined => {
  return doc.calendarEvents[id];
};

// Get calendar events for entity
export const getCalendarEventsForEntity = (
  doc: AutomergeDoc,
  entityType: EntityLinkType,
  entityId: EntityId
): EntityId[] => {
  return Object.values(doc.relations.entityLinks)
    .filter(link =>
      link.linkType === 'calendarEvent' &&
      link.entityType === entityType &&
      link.entityId === entityId
    )
    .map(link => link.calendarEventId!)
    .filter(Boolean);
};

// Get entities linked to calendar event
export const getEntitiesForCalendarEvent = (
  doc: AutomergeDoc,
  calendarEventId: EntityId
): LinkedEntityInfo[] => {
  return Object.entries(doc.relations.entityLinks)
    .filter(([_, link]) =>
      link.linkType === 'calendarEvent' &&
      link.calendarEventId === calendarEventId
    )
    .map(([linkId, link]) => ({
      linkId,
      entityType: link.entityType,
      entityId: link.entityId,
    }));
};

// Get recurring event instances
export const getRecurringEventInstances = (
  doc: AutomergeDoc,
  parentEventId: EntityId
): CalendarEvent[] => {
  return Object.values(doc.calendarEvents)
    .filter(event => event.recurrenceId === parentEventId);
};

// Get calendar events in date range
export const getCalendarEventsInRange = (
  doc: AutomergeDoc,
  startDate: Timestamp,
  endDate: Timestamp
): CalendarEvent[] => {
  return Object.values(doc.calendarEvents)
    .filter(event => {
      const eventDate = event.scheduledFor;
      return eventDate >= startDate && eventDate <= endDate;
    });
};
```

### 4.2 Hooks

**File**: `CRMOrbit/views/store/store.ts`

```typescript
// Basic CRUD hooks
export const useCalendarEvent = (id: EntityId): CalendarEvent | undefined => {
  return useStore(state => getCalendarEvent(state.doc, id));
};

export const useAllCalendarEvents = (): CalendarEvent[] => {
  return useStore(state => getAllCalendarEvents(state.doc));
};

export const useCalendarEventsForEntity = (
  entityType: EntityLinkType,
  entityId: EntityId
): CalendarEvent[] => {
  return useStore(state => {
    const eventIds = getCalendarEventsForEntity(state.doc, entityType, entityId);
    return eventIds
      .map(id => getCalendarEvent(state.doc, id))
      .filter(Boolean) as CalendarEvent[];
  });
};

export const useEntitiesForCalendarEvent = (
  calendarEventId: EntityId
): LinkedEntityInfo[] => {
  return useStore(state =>
    getEntitiesForCalendarEvent(state.doc, calendarEventId)
  );
};

// Recurrence hooks
export const useRecurringEventInstances = (
  parentEventId: EntityId
): CalendarEvent[] => {
  return useStore(state =>
    getRecurringEventInstances(state.doc, parentEventId)
  );
};

// Date range hook
export const useCalendarEventsInRange = (
  startDate: Timestamp,
  endDate: Timestamp
): CalendarEvent[] => {
  return useStore(state =>
    getCalendarEventsInRange(state.doc, startDate, endDate)
  );
};
```

### 4.3 Action Hooks

**File**: `CRMOrbit/views/hooks/useCalendarEventActions.ts`

```typescript
import { useDispatch } from '../store/dispatch';
import { buildEvent } from '../../domains/actions/eventBuilder';
import {
  CalendarEvent,
  CalendarEventType,
  CalendarEventStatus,
  RecurrenceRule
} from '../../domains/calendarEvent';

export const useCalendarEventActions = () => {
  const dispatch = useDispatch();

  // Schedule new event
  const scheduleCalendarEvent = (
    type: CalendarEventType,
    summary: string,
    scheduledFor: Timestamp,
    durationMinutes?: number,
    linkedEntities?: { entityType: EntityLinkType; entityId: EntityId }[],
    recurrenceRule?: RecurrenceRule,
    location?: string
  ) => {
    const calendarEvent: CalendarEvent = {
      id: generateEntityId(),
      type,
      status: 'scheduled',
      summary,
      scheduledFor,
      durationMinutes,
      recurrenceRule,
      location,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const event = buildEvent(
      'calendarEvent.scheduled',
      calendarEvent.id,
      { calendarEvent, linkedEntities }
    );

    return dispatch(event);
  };

  // Mark event as completed
  const completeCalendarEvent = (
    calendarEventId: EntityId,
    occurredAt: Timestamp,
    score?: number,
    floorsVisited?: number[],
    description?: string
  ) => {
    const event = buildEvent(
      'calendarEvent.completed',
      calendarEventId,
      { calendarEventId, occurredAt, score, floorsVisited, description }
    );

    return dispatch(event);
  };

  // Reschedule event
  const rescheduleCalendarEvent = (
    calendarEventId: EntityId,
    newScheduledFor: Timestamp,
    applyToSeries?: boolean
  ) => {
    const event = buildEvent(
      'calendarEvent.rescheduled',
      calendarEventId,
      { calendarEventId, newScheduledFor, applyToSeries }
    );

    return dispatch(event);
  };

  // Cancel event
  const cancelCalendarEvent = (calendarEventId: EntityId) => {
    const event = buildEvent(
      'calendarEvent.canceled',
      calendarEventId,
      { calendarEventId }
    );

    return dispatch(event);
  };

  // Update event
  const updateCalendarEvent = (
    calendarEventId: EntityId,
    updates: Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>
  ) => {
    const event = buildEvent(
      'calendarEvent.updated',
      calendarEventId,
      { calendarEventId, updates }
    );

    return dispatch(event);
  };

  // Delete event
  const deleteCalendarEvent = (calendarEventId: EntityId) => {
    const event = buildEvent(
      'calendarEvent.deleted',
      calendarEventId,
      { calendarEventId }
    );

    return dispatch(event);
  };

  // Add recurrence rule
  const addRecurrenceRule = (
    calendarEventId: EntityId,
    recurrenceRule: RecurrenceRule
  ) => {
    const event = buildEvent(
      'calendarEvent.recurrence.created',
      calendarEventId,
      { calendarEventId, recurrenceRule }
    );

    return dispatch(event);
  };

  return {
    scheduleCalendarEvent,
    completeCalendarEvent,
    rescheduleCalendarEvent,
    cancelCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    addRecurrenceRule,
  };
};
```

---

## Phase 5: UI Component Migration

### 5.1 Components to Update

| Component | File Path | Changes Required |
|-----------|-----------|------------------|
| **CalendarScreen** | `views/screens/calendar/CalendarScreen.tsx` | Update to use `useAllCalendarEvents` instead of separate audit/interaction hooks |
| **CalendarView** | `views/components/CalendarView.tsx` | Refactor to handle unified CalendarEvent type |
| **TimelineView** | `views/components/TimelineView.tsx` | Update to use single event type |
| **InteractionFormScreen** | `views/screens/interactions/InteractionFormScreen.tsx` | Rename to `CalendarEventFormScreen`, add audit fields conditionally |
| **InteractionDetailScreen** | `views/screens/interactions/InteractionDetailScreen.tsx` | Rename to `CalendarEventDetailScreen`, handle all event types |
| **InteractionsListScreen** | `views/screens/interactions/InteractionsListScreen.tsx` | Update to `CalendarEventsListScreen` |
| **AuditFormScreen** | `views/screens/audits/AuditFormScreen.tsx` | Merge into `CalendarEventFormScreen` |
| **AuditDetailScreen** | `views/screens/audits/AuditDetailScreen.tsx` | Merge into `CalendarEventDetailScreen` |

### 5.2 Calendar View Refactor

**File**: `CRMOrbit/views/components/CalendarView.tsx`

**Current Approach**:
```typescript
// OLD - separate calls for audits and interactions
const audits = useAllAudits();
const interactions = useAllInteractions();
const agendaItems = buildAgendaItems(audits, interactions);
```

**New Approach**:
```typescript
// NEW - unified calendar events
const calendarEvents = useAllCalendarEvents();
const agendaItems = buildAgendaItems(calendarEvents);
```

**Updated Agenda Item Type**:
```typescript
type AgendaItem = {
  id: string;
  calendarEvent: CalendarEvent;
  entityName: string;
  startTimestamp: string;
  endTimestamp?: string;
  statusTone: 'default' | 'positive' | 'critical';
  statusKey: string;

  // Type-specific display
  icon: string;
  color: string;

  // Audit-specific (only if type='audit')
  scoreValue?: string;
  floorsVisited?: number[];
};
```

### 5.3 Unified Event Form Screen

**File**: `CRMOrbit/views/screens/calendar/CalendarEventFormScreen.tsx`

**Features**:
- Single form for all event types (meeting, call, email, audit)
- Event type picker at top
- Conditional fields based on type:
  - **All types**: summary, scheduledFor, durationMinutes, status
  - **Audits only**: score, floorsVisited (shown after completion)
  - **Meetings only**: location (optional)
- Recurrence options (Phase 6 - after basic migration)

**Form Structure**:
```typescript
interface FormState {
  type: CalendarEventType;
  summary: string;
  scheduledFor: string;
  durationMinutes?: number;
  status: CalendarEventStatus;
  location?: string;

  // Audit-specific (only shown if type='audit')
  score?: number;
  floorsVisited?: number[];

  // Recurrence (Phase 6)
  isRecurring?: boolean;
  recurrenceRule?: RecurrenceRule;
}
```

### 5.4 Calendar Data Transformers Update

**File**: `CRMOrbit/views/utils/calendarDataTransformers.ts`

**New Functions**:
```typescript
// Replace buildAuditAgendaItem + buildInteractionAgendaItem with:
export const buildAgendaItem = (
  calendarEvent: CalendarEvent,
  linkedEntityName: string
): AgendaItem => {
  const start = calendarEvent.scheduledFor;
  const end = calendarEvent.durationMinutes
    ? addMinutes(start, calendarEvent.durationMinutes)
    : undefined;

  return {
    id: calendarEvent.id,
    calendarEvent,
    entityName: linkedEntityName,
    startTimestamp: start,
    endTimestamp: end,
    statusTone: getStatusTone(calendarEvent),
    statusKey: getStatusKey(calendarEvent),
    icon: getEventIcon(calendarEvent.type),
    color: getEventColor(calendarEvent.type, calendarEvent.status),
    scoreValue: calendarEvent.auditData?.score?.toString(),
    floorsVisited: calendarEvent.auditData?.floorsVisited,
  };
};

const getEventIcon = (type: CalendarEventType): string => {
  switch (type) {
    case 'meeting': return 'people';
    case 'call': return 'call';
    case 'email': return 'mail';
    case 'audit': return 'clipboard';
    case 'task': return 'checkbox';
    case 'reminder': return 'alarm';
    default: return 'calendar';
  }
};

const getEventColor = (
  type: CalendarEventType,
  status: CalendarEventStatus
): string => {
  if (status === 'canceled') return '#999';
  if (status === 'completed') return '#4CAF50';

  switch (type) {
    case 'audit': return '#2196F3';
    case 'meeting': return '#9C27B0';
    case 'call': return '#FF9800';
    case 'email': return '#00BCD4';
    default: return '#607D8B';
  }
};
```

### 5.5 Navigation Updates

**File**: `CRMOrbit/views/navigation/types.ts`

```typescript
// OLD - separate stacks
export type InteractionStackParamList = {
  InteractionsList: undefined;
  InteractionForm: { entityType?: EntityLinkType; entityId?: EntityId };
  InteractionDetail: { interactionId: EntityId };
};

export type AuditStackParamList = {
  AuditsList: undefined;
  AuditForm: { accountId: EntityId };
  AuditDetail: { auditId: EntityId };
};

// NEW - unified stack
export type CalendarEventStackParamList = {
  CalendarEventsList: {
    filterType?: CalendarEventType; // Optional filter
  };
  CalendarEventForm: {
    eventType?: CalendarEventType;
    entityType?: EntityLinkType;
    entityId?: EntityId;
    initialScheduledFor?: string;
  };
  CalendarEventDetail: {
    calendarEventId: EntityId;
  };
};
```

---

## Phase 6: Recurrence Support

### 6.1 Recurrence Instance Generation

**File**: `CRMOrbit/domains/recurrence/instanceGenerator.ts`

```typescript
export const generateRecurrenceInstances = (
  parentEvent: CalendarEvent,
  startDate: Timestamp,
  endDate: Timestamp
): CalendarEvent[] => {
  if (!parentEvent.recurrenceRule) return [parentEvent];

  const instances: CalendarEvent[] = [];
  const rule = parentEvent.recurrenceRule;
  let currentDate = new Date(parentEvent.scheduledFor);
  const end = rule.until ? new Date(rule.until) : new Date(endDate);

  let count = 0;
  const maxCount = rule.count || Infinity;

  while (currentDate <= end && count < maxCount) {
    // Create instance
    const instance: CalendarEvent = {
      ...parentEvent,
      id: generateEntityId(),
      recurrenceId: parentEvent.id,
      scheduledFor: currentDate.toISOString(),
    };

    instances.push(instance);

    // Calculate next occurrence
    currentDate = getNextOccurrence(currentDate, rule);
    count++;
  }

  return instances;
};

const getNextOccurrence = (
  current: Date,
  rule: RecurrenceRule
): Date => {
  const next = new Date(current);

  switch (rule.frequency) {
    case 'daily':
      next.setDate(next.getDate() + rule.interval);
      break;
    case 'weekly':
      next.setDate(next.getDate() + (7 * rule.interval));
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + rule.interval);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + rule.interval);
      break;
  }

  return next;
};
```

### 6.2 Recurrence UI Component

**File**: `CRMOrbit/views/components/RecurrenceRulePicker.tsx`

**Features**:
- Frequency selector (daily/weekly/monthly/yearly)
- Interval input (every N days/weeks/etc)
- End condition:
  - Never (no until/count)
  - On date (until)
  - After N occurrences (count)
- Weekly: day of week multi-select
- Monthly: day of month selector

### 6.3 Update Calendar Views for Recurrence

**CalendarView Changes**:
- Show recurring icon on parent events
- Expand recurring events into instances for display
- Allow editing single instance vs entire series
- Show "This is a recurring event" badge

---

## Phase 7: Data Migration

### 7.1 Migration Script

**File**: `CRMOrbit/domains/migration/migrateToCalendarEvents.ts`

```typescript
import { AutomergeDoc } from '../automerge/schema';
import { CalendarEvent } from '../calendarEvent';
import { Event } from '../events/event';
import { buildEvent } from '../actions/eventBuilder';

export interface MigrationResult {
  success: boolean;
  migratedInteractions: number;
  migratedAudits: number;
  migratedLinks: number;
  errors: string[];
}

export const migrateToCalendarEvents = (
  doc: AutomergeDoc,
  dispatcher: (event: Event) => void
): MigrationResult => {
  const result: MigrationResult = {
    success: true,
    migratedInteractions: 0,
    migratedAudits: 0,
    migratedLinks: 0,
    errors: [],
  };

  try {
    // Step 1: Migrate interactions to calendar events
    for (const interaction of Object.values(doc.interactions)) {
      const calendarEvent = migrateInteractionToCalendarEvent(interaction);

      const event = buildEvent(
        'calendarEvent.scheduled',
        calendarEvent.id,
        { calendarEvent }
      );

      dispatcher(event);
      result.migratedInteractions++;
    }

    // Step 2: Migrate audits to calendar events
    for (const audit of Object.values(doc.audits)) {
      const calendarEvent = migrateAuditToCalendarEvent(audit);

      const event = buildEvent(
        'calendarEvent.scheduled',
        calendarEvent.id,
        { calendarEvent }
      );

      dispatcher(event);
      result.migratedAudits++;
    }

    // Step 3: Migrate entity links
    for (const [linkId, link] of Object.entries(doc.relations.entityLinks)) {
      if (link.linkType === 'interaction' && link.interactionId) {
        // Find corresponding calendar event
        const calendarEventId = findCalendarEventIdForInteraction(
          doc,
          link.interactionId
        );

        if (calendarEventId) {
          // Create new link with calendarEventId
          const newLink = {
            ...link,
            linkType: 'calendarEvent' as const,
            calendarEventId,
          };

          // Update link in place (Automerge will track this)
          doc.relations.entityLinks[linkId] = newLink;
          result.migratedLinks++;
        }
      }
    }

  } catch (error) {
    result.success = false;
    result.errors.push((error as Error).message);
  }

  return result;
};

const migrateInteractionToCalendarEvent = (
  interaction: Interaction
): CalendarEvent => {
  return {
    id: interaction.id,
    type: interaction.type, // meeting, call, email, other
    status: interaction.status || 'completed',
    summary: interaction.summary,
    description: undefined,
    scheduledFor: interaction.scheduledFor || interaction.occurredAt,
    occurredAt: interaction.status === 'completed'
      ? interaction.occurredAt
      : undefined,
    durationMinutes: interaction.durationMinutes,
    createdAt: interaction.createdAt,
    updatedAt: interaction.updatedAt,
  };
};

const migrateAuditToCalendarEvent = (
  audit: Audit
): CalendarEvent => {
  return {
    id: audit.id,
    type: 'audit',
    status: audit.status,
    summary: `Audit - ${audit.accountId}`, // Will be enriched with account name
    description: audit.notes,
    scheduledFor: audit.scheduledFor,
    occurredAt: audit.occurredAt,
    durationMinutes: audit.durationMinutes,
    auditData: {
      score: audit.score,
      floorsVisited: audit.floorsVisited,
    },
    createdAt: audit.createdAt,
    updatedAt: audit.updatedAt,
  };
};

const findCalendarEventIdForInteraction = (
  doc: AutomergeDoc,
  interactionId: EntityId
): EntityId | undefined => {
  // Calendar events keep same ID as original interaction/audit
  return doc.calendarEvents[interactionId] ? interactionId : undefined;
};
```

### 7.2 Migration Execution

**File**: `CRMOrbit/domains/migration/runMigration.ts`

```typescript
import { useStore } from '../views/store/store';
import { useDispatch } from '../views/store/dispatch';
import { migrateToCalendarEvents } from './migrateToCalendarEvents';

export const useMigration = () => {
  const doc = useStore(state => state.doc);
  const dispatch = useDispatch();

  const runCalendarEventMigration = async () => {
    console.log('Starting calendar event migration...');

    const result = migrateToCalendarEvents(doc, dispatch);

    if (result.success) {
      console.log('Migration completed successfully:');
      console.log(`- Migrated ${result.migratedInteractions} interactions`);
      console.log(`- Migrated ${result.migratedAudits} audits`);
      console.log(`- Migrated ${result.migratedLinks} entity links`);

      // Mark migration as complete in settings
      // (Prevents re-running on subsequent app loads)
      await markMigrationComplete('calendarEvent.v1');
    } else {
      console.error('Migration failed:', result.errors);
      throw new Error(`Migration failed: ${result.errors.join(', ')}`);
    }

    return result;
  };

  return { runCalendarEventMigration };
};

// Check if migration has already run
export const hasMigrationRun = async (
  migrationId: string
): Promise<boolean> => {
  // Check AsyncStorage for migration marker
  const migrations = await AsyncStorage.getItem('completedMigrations');
  if (!migrations) return false;

  const completed = JSON.parse(migrations);
  return completed.includes(migrationId);
};

const markMigrationComplete = async (migrationId: string) => {
  const existing = await AsyncStorage.getItem('completedMigrations');
  const completed = existing ? JSON.parse(existing) : [];

  completed.push(migrationId);
  await AsyncStorage.setItem('completedMigrations', JSON.stringify(completed));
};
```

### 7.3 Migration Trigger

**File**: `CRMOrbit/App.tsx`

```typescript
import { useMigration, hasMigrationRun } from './domains/migration/runMigration';

export default function App() {
  const { runCalendarEventMigration } = useMigration();
  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    const checkAndRunMigration = async () => {
      const migrationComplete = await hasMigrationRun('calendarEvent.v1');

      if (!migrationComplete) {
        setIsMigrating(true);
        try {
          await runCalendarEventMigration();
        } catch (error) {
          console.error('Migration error:', error);
          // Show error to user
        } finally {
          setIsMigrating(false);
        }
      }
    };

    checkAndRunMigration();
  }, []);

  if (isMigrating) {
    return <MigrationScreen />;
  }

  return <YourApp />;
}
```

---

## Phase 8: Device Calendar Sync Improvements

### 8.1 Automatic Sync Hook

**File**: `CRMOrbit/views/hooks/useAutoDeviceCalendarSync.ts`

```typescript
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { syncToDeviceCalendar } from '../utils/deviceCalendar';
import { useAllCalendarEvents } from '../store/store';

export const useAutoDeviceCalendarSync = () => {
  const calendarEvents = useAllCalendarEvents();

  useEffect(() => {
    // Sync whenever calendar events change
    const handleSync = async () => {
      try {
        await syncToDeviceCalendar(calendarEvents);
      } catch (error) {
        console.error('Device calendar sync failed:', error);
      }
    };

    handleSync();
  }, [calendarEvents]);

  useEffect(() => {
    // Also sync when app comes to foreground
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncToDeviceCalendar(calendarEvents);
      }
    });

    return () => subscription.remove();
  }, [calendarEvents]);
};
```

### 8.2 Updated Device Calendar Builder

**File**: `CRMOrbit/views/utils/deviceCalendar.ts`

**Update to handle CalendarEvent**:
```typescript
import { CalendarEvent } from '../../domains/calendarEvent';

export const buildDeviceCalendarEvent = (
  calendarEvent: CalendarEvent,
  linkedEntityName: string,
  labels: Labels
): CalendarEventInput => {
  const startDate = new Date(calendarEvent.scheduledFor);
  const endDate = calendarEvent.durationMinutes
    ? addMinutes(startDate, calendarEvent.durationMinutes)
    : addMinutes(startDate, 60); // Default 1 hour

  let title = `${getEventTypeLabel(calendarEvent.type, labels)} - ${linkedEntityName}`;
  if (calendarEvent.status === 'canceled') {
    title = `Canceled: ${title}`;
  }

  let notes = calendarEvent.summary;
  if (calendarEvent.description) {
    notes += `\n\n${calendarEvent.description}`;
  }

  // Add audit-specific notes
  if (calendarEvent.type === 'audit' && calendarEvent.auditData) {
    if (calendarEvent.auditData.score !== undefined) {
      notes += `\nScore: ${calendarEvent.auditData.score}`;
    }
    if (calendarEvent.auditData.floorsVisited) {
      notes += `\nFloors: ${calendarEvent.auditData.floorsVisited.join(', ')}`;
    }
  }

  return {
    title,
    startDate,
    endDate,
    notes,
    location: calendarEvent.location,
    alarms: calendarEvent.status === 'canceled'
      ? []
      : getDefaultAlarms(calendarEvent.type),
  };
};

const getEventTypeLabel = (
  type: CalendarEventType,
  labels: Labels
): string => {
  switch (type) {
    case 'meeting': return labels['calendarEvent.type.meeting'];
    case 'call': return labels['calendarEvent.type.call'];
    case 'email': return labels['calendarEvent.type.email'];
    case 'audit': return labels['calendarEvent.type.audit'];
    default: return type;
  }
};
```

### 8.3 Sync Settings

Add settings to control sync behavior:
- **Auto-sync enabled** (default: true)
- **Sync frequency** (on change, hourly, manual)
- **Sync canceled events** (default: false)
- **Calendar name** (default: "CRMOrbit")

---

## Phase 9: Testing Strategy

### 9.1 Unit Tests

**Files to test**:
- `calendarEvent.reducer.test.ts` - All reducer functions
- `calendarEventActions.test.ts` - Action hooks
- `recurrence/instanceGenerator.test.ts` - Recurrence logic
- `migration/migrateToCalendarEvents.test.ts` - Migration script

**Test cases**:
- Create calendar event with all fields
- Complete scheduled event (sets occurredAt)
- Reschedule event (updates scheduledFor)
- Cancel event (sets status)
- Delete event (removes entity links)
- Create recurring event
- Generate recurrence instances
- Migrate interaction to calendar event
- Migrate audit to calendar event

### 9.2 Integration Tests

**Test scenarios**:
1. **Create and display event**:
   - Create calendar event via form
   - Verify appears in calendar view
   - Verify appears in timeline view
   - Verify appears in entity detail screen

2. **Link to entity**:
   - Create event linked to account
   - Verify appears in account timeline
   - Unlink from account
   - Verify removed from account timeline

3. **Recurrence**:
   - Create weekly recurring meeting
   - Verify instances appear in calendar
   - Edit single instance
   - Edit entire series

4. **Device sync**:
   - Create event in app
   - Verify syncs to device calendar
   - Update event
   - Verify device calendar updates

### 9.3 Migration Tests

**Test scenarios**:
1. **Fresh install**: No migration runs
2. **Existing interactions**: All interactions migrated
3. **Existing audits**: All audits migrated
4. **Entity links preserved**: Links still work after migration
5. **Idempotent**: Running twice doesn't duplicate events

---

## Phase 10: Rollout Plan

### 10.1 Alpha Phase (Internal Testing)

**Checklist**:
- [ ] Data model implemented
- [ ] Event types defined
- [ ] Reducers implemented
- [ ] Hooks and selectors working
- [ ] Basic UI refactored (no recurrence yet)
- [ ] Migration script tested
- [ ] Unit tests passing

**Testing**:
- Create test data with interactions and audits
- Run migration on test device
- Verify all data migrated correctly
- Test basic CRUD operations

### 10.2 Beta Phase (Limited Users)

**Checklist**:
- [ ] Recurrence support added
- [ ] Auto device sync implemented
- [ ] All UI components updated
- [ ] Integration tests passing
- [ ] Migration tested on real user data (backup first!)

**Features**:
- All calendar event types functional
- Recurrence working
- Device sync automatic

### 10.3 Production Release

**Checklist**:
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Migration tested extensively
- [ ] Rollback plan prepared

**Release notes**:
- Unified calendar events (interactions + audits)
- Recurring events support
- Automatic device calendar sync
- Improved calendar UI

### 10.4 Cleanup Phase (After Release)

**After 2-3 release cycles with stable migration**:
- Remove deprecated `interactions` and `audits` fields from AutomergeDoc
- Remove legacy event types
- Remove migration code
- Bump major version

---

## Critical Migration Considerations

### 1. Data Loss Prevention
- **ALWAYS backup before migration**: Automerge snapshots + event log
- Test migration on copy of production data first
- Migration script must be idempotent (safe to run multiple times)
- Keep deprecated fields until migration is proven stable

### 2. Backward Compatibility
- During transition, support both old and new event types
- Keep legacy reducers active until all events migrated
- Entity links must support both `interactionId` and `calendarEventId`

### 3. Automerge Sync Compatibility
- Devices on old version must still sync with devices on new version
- Consider phased rollout: all devices must migrate together in a sync group
- May need to force update for all devices in a sync group simultaneously

### 4. Device Calendar Sync
- Clear existing CRMOrbit calendar before re-syncing after migration
- Map old device calendar event IDs to new ones
- Preserve user's alarm/notification preferences

---

## Timeline Estimate

**Assumptions**: One developer, familiar with codebase

| Phase | Estimated Time | Notes |
|-------|----------------|-------|
| Phase 1: Data Model | 1-2 days | Define types, update schema |
| Phase 2: Event System | 2-3 days | Event types, payloads |
| Phase 3: Reducers | 3-5 days | Complex logic, test thoroughly |
| Phase 4: State Management | 2-3 days | Hooks, selectors, actions |
| Phase 5: UI Migration | 5-7 days | Largest effort, many components |
| Phase 6: Recurrence | 3-4 days | New feature, requires careful testing |
| Phase 7: Data Migration | 3-4 days | Critical, must be bulletproof |
| Phase 8: Device Sync | 2-3 days | Update existing sync logic |
| Phase 9: Testing | 3-5 days | Comprehensive test coverage |
| Phase 10: Rollout | 2-3 days | Phased deployment, monitoring |
| **TOTAL** | **26-39 days** | ~5-8 weeks for full migration |

---

## Open Questions

### Pre-Implementation Decisions Needed:

1. **Should we preserve exact entity IDs during migration?**
   - Option A: Keep same ID (interaction.id → calendarEvent.id)
   - Option B: Generate new IDs, maintain mapping table
   - **Recommendation**: Option A - simpler, preserves references

2. **How to handle existing device calendar events?**
   - Option A: Delete all, re-sync with new format
   - Option B: Update in place using stored mapping
   - **Recommendation**: Option A - cleaner, fewer edge cases

3. **Should audit-specific fields stay in main entity or nested?**
   - Current plan: Nested in `auditData` field
   - Alternative: Flatten all fields into CalendarEvent
   - **Recommendation**: Keep nested - clearer data model

4. **Recurrence instance storage strategy?**
   - Option A: Generate instances on-demand (not stored)
   - Option B: Store instances as separate entities
   - **Recommendation**: Option A for initial implementation, B for performance if needed

5. **How to handle recurrence editing?**
   - "This event" vs "This and following" vs "All events"
   - **Recommendation**: Start with "This event" and "All events", add "Following" later

---

## Success Criteria

Migration is successful when:
- ✅ All existing interactions migrated to calendar events
- ✅ All existing audits migrated to calendar events
- ✅ All entity links preserved and functional
- ✅ Calendar views display events correctly
- ✅ CRUD operations work for all event types
- ✅ Device calendar sync working automatically
- ✅ Recurring events can be created and displayed
- ✅ No data loss or corruption
- ✅ Event-sourcing and CRDT sync still functional
- ✅ All tests passing

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss during migration | Medium | Critical | Mandatory backup before migration, idempotent script, extensive testing |
| Sync conflicts between versions | High | High | Coordinated rollout, version checks, backward compat mode |
| Performance degradation | Low | Medium | Profile before/after, optimize selectors, lazy loading |
| UI regression | Medium | Medium | Comprehensive manual testing, screenshot tests |
| Recurrence bugs | Medium | High | Extensive edge case testing, start simple |

---

## Next Steps

1. **Review this roadmap** with team
2. **Decide on open questions** (entity IDs, device calendar handling, etc.)
3. **Create detailed task breakdown** in project management tool
4. **Set up feature branch** for migration work
5. **Implement Phase 1** (data model) and get approval before proceeding
6. **Create backup/restore tooling** before starting migration work
7. **Write migration tests first** (TDD approach)

---

## References

- Current Interaction Model: [domains/interaction.ts](../../domains/interaction.ts)
- Current Audit Model: [domains/audit.ts](../../domains/audit.ts)
- Existing Reducers: [reducers/interaction.reducer.ts](../../reducers/interaction.reducer.ts)
- Calendar View: [views/components/CalendarView.tsx](../../views/components/CalendarView.tsx)
- Automerge Schema: [automerge/schema.ts](../../automerge/schema.ts)
