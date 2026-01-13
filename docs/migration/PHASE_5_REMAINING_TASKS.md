# Phase 5: UI Component Migration - Remaining Tasks

## Progress Summary

### ✅ Completed (Commits bc38eca → de2de17)
1. **Phase 5.1**: Navigation types updated (`types.ts`)
2. **Phase 5.2**: CalendarEventFormScreen created (937 lines)
3. **Phase 5.3**: CalendarEventDetailScreen created (467 lines)
4. **Phase 5.4**: CalendarEventsListScreen created (199 lines)

**Total**: ~1,800 lines of new unified UI code

### 🔄 Remaining Tasks

## Task 5.5: Update CalendarView Component

**File**: `CRMOrbit/views/components/CalendarView.tsx`

**Current State**:
- Accepts separate `audits` and `interactions` arrays
- Uses `buildAuditAgendaItem` and `buildInteractionAgendaItem`
- Renders agenda items with type-specific logic

**Changes Needed**:
```typescript
// OLD interface
export interface CalendarViewProps {
  audits: Audit[];
  interactions: Interaction[];
  accountNames: Map<string, string>;
  unknownEntityLabel: string;
  labels: CalendarViewLabels;
  entityNamesForInteraction: (interactionId: string) => string;
  onAuditPress: (auditId: string) => void;
  onInteractionPress: (interactionId: string) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
}

// NEW interface
export interface CalendarViewProps {
  calendarEvents: CalendarEvent[];
  accountNames: Map<string, string>;
  unknownEntityLabel: string;
  labels: CalendarViewLabels;
  entityNamesForEvent: (eventId: string) => string;
  onEventPress: (eventId: string) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
}
```

**Data Transformer Updates**:
- Update `CRMOrbit/views/utils/calendarDataTransformers.ts`
- Create new `buildCalendarEventAgendaItem(event, accountName, entityNames)`
- Merge logic from `buildAuditAgendaItem` and `buildInteractionAgendaItem`
- Update `buildMarkedDates` to work with CalendarEvent array

**Label Updates**:
```typescript
export type CalendarViewLabels = {
  emptyTitle: string;
  emptyHint: string;
  unknownValue: string;
  event: {
    scheduledForLabel: string;
    occurredAtLabel: string;
    endsAtLabel: string;
    scoreLabel: string;
    floorsVisitedLabel: string;
    durationLabel: string;
    statusLabel: string;
  };
};
```

**Rendering Logic**:
- Single render path based on `event.type`
- Show account name for `type === 'audit'`
- Show summary for other types
- Status badge for all types
- Type-specific icons (reuse from CalendarEventsListScreen)

---

## Task 5.6: Update TimelineView Component

**File**: `CRMOrbit/views/components/TimelineView.tsx`

**Current State**:
- Uses `react-native-calendars` TimelineList
- Accepts separate audits/interactions
- Transforms to timeline event format

**Changes Needed**:
```typescript
// OLD interface
export interface TimelineViewProps {
  audits: Audit[];
  interactions: Interaction[];
  accountNames: Map<string, string>;
  onAuditPress: (auditId: string) => void;
  onInteractionPress: (interactionId: string) => void;
}

// NEW interface
export interface TimelineViewProps {
  calendarEvents: CalendarEvent[];
  accountNames: Map<string, string>;
  onEventPress: (eventId: string) => void;
}
```

**Timeline Event Builder**:
- Create unified `buildTimelineEvent(event, accountName)` function
- Map CalendarEvent to TimelineEventProps format
- Handle duration and time slots
- Color coding by event type or status

---

## Task 5.7: Update CalendarScreen

**File**: `CRMOrbit/views/screens/calendar/CalendarScreen.tsx`

**Current State**:
```typescript
const audits = useAllAudits();
const interactions = useAllInteractions();
```

**Changes Needed**:
```typescript
const calendarEvents = useAllCalendarEvents();
const entityNamesForEvent = useCallback((eventId: string) => {
  const entities = getEntitiesForCalendarEvent(doc, eventId);
  return entities.map(e => e.name).filter(Boolean).join(", ");
}, [doc]);

const handleEventPress = (eventId: string) => {
  navigation.navigate("CalendarEventDetail", { calendarEventId: eventId });
};
```

**Quick Add Modal Updates**:
- Change "Add Audit" → "Add Audit Event"
- Change "Add Interaction" → "Add Event"
- Or unify to single "Add Event" button with type selector

---

## Task 5.8: Create CalendarEventsSection Component

**File**: `CRMOrbit/views/components/CalendarEventsSection.tsx` (new)

**Purpose**:
Unified section component for displaying calendar events linked to entities (replaces AuditsSection + InteractionsSection)

**Interface**:
```typescript
export interface CalendarEventsSectionProps {
  entityType: EntityLinkType;
  entityId: EntityId;
  title?: string;
  filterType?: CalendarEventType; // Optional: show only audits, meetings, etc.
  maxVisible?: number;
  onEventPress: (eventId: string) => void;
  onAddEvent: () => void;
  onLinkEvent?: () => void;
}
```

**Features**:
- Display up to N events (default 3)
- "View All" modal for more
- Add/Link event buttons
- Type-specific display (account name for audits, summary for others)
- Status badges
- Unlink functionality with confirmation

**Usage**:
```typescript
// In AccountDetailScreen
<CalendarEventsSection
  entityType="account"
  entityId={accountId}
  filterType="audit" // Show only audit events
  title="Audits"
  onEventPress={handleEventPress}
  onAddEvent={() => navigation.navigate("CalendarEventForm", {
    accountId,
    entityToLink: { entityType: "account", entityId }
  })}
/>

// In OrganizationDetailScreen
<CalendarEventsSection
  entityType="organization"
  entityId={organizationId}
  title="Events"
  onEventPress={handleEventPress}
  onAddEvent={() => navigation.navigate("CalendarEventForm", {
    entityToLink: { entityType: "organization", entityId: organizationId }
  })}
/>
```

---

## Task 5.9: Update LinkEntityModal Components

**File**: `CRMOrbit/views/components/LinkEntityToInteractionModal.tsx`

**Action**: Duplicate and adapt to `LinkEntityToCalendarEventModal.tsx`

**Changes**:
```typescript
export interface LinkEntityToCalendarEventModalProps {
  visible: boolean;
  onClose: () => void;
  calendarEventId: EntityId;
  existingEntityIds: Set<EntityId>;
}

export const LinkEntityToCalendarEventModal = ({
  visible,
  onClose,
  calendarEventId,
  existingEntityIds,
}: LinkEntityToCalendarEventModalProps) => {
  const deviceId = useDeviceId();
  const { linkCalendarEvent } = useEntityLinkActions(deviceId);

  const handleLink = (entityType: EntityLinkType, entityId: EntityId) => {
    const result = linkCalendarEvent(calendarEventId, entityType, entityId);
    if (result.success) {
      onClose();
    } else {
      // Show error
    }
  };

  return (
    <TwoTierLinkModal
      visible={visible}
      onClose={onClose}
      onLink={handleLink}
      existingEntityIds={existingEntityIds}
      // ... other props
    />
  );
};
```

**Then Update CalendarEventDetailScreen**:
- Uncomment the modal usage
- Import the new component
- Wire up the link button

---

## Task 5.10: Update EventsLandingScreen

**File**: `CRMOrbit/views/screens/events/EventsLandingScreen.tsx`

**Current State**:
Shows 3 cards: Audits, Calendar, Interactions

**Changes Needed**:
```typescript
// OLD
const audits = useAllAudits();
const interactions = useAllInteractions();

// Card 1: Audits (audits.length)
// Card 2: Calendar (navigation to Calendar)
// Card 3: Interactions (interactions.length)

// NEW
const calendarEvents = useAllCalendarEvents();
const auditEvents = calendarEvents.filter(e => e.type === 'audit');
const otherEvents = calendarEvents.filter(e => e.type !== 'audit');

// Option A: Three cards
// Card 1: Audits (auditEvents.length) → CalendarEventsList filtered
// Card 2: Calendar (navigation to Calendar)
// Card 3: Events (otherEvents.length) → CalendarEventsList filtered

// Option B: Two cards (recommended)
// Card 1: Calendar (navigation to Calendar view)
// Card 2: All Events (calendarEvents.length) → CalendarEventsList
```

**Recommendation**: Use Option B (2 cards) - simpler and unified

---

## Task 5.11: Update EventsStack Navigation

**File**: `CRMOrbit/views/navigation/EventsStack.tsx`

**Changes Needed**:
```typescript
import { CalendarEventFormScreen } from "../screens/calendarEvents/CalendarEventFormScreen";
import { CalendarEventDetailScreen } from "../screens/calendarEvents/CalendarEventDetailScreen";
import { CalendarEventsListScreen } from "../screens/calendarEvents/CalendarEventsListScreen";

// Add new routes
<Stack.Screen
  name="CalendarEventsList"
  component={CalendarEventsListScreen}
  options={{ title: t("calendarEvents.listTitle") }}
/>
<Stack.Screen
  name="CalendarEventDetail"
  component={CalendarEventDetailScreen}
  options={{ title: t("calendarEvents.detailTitle") }}
/>
<Stack.Screen
  name="CalendarEventForm"
  component={CalendarEventFormScreen}
  options={({ route }) => ({
    title: route.params?.calendarEventId
      ? t("calendarEvents.editTitle")
      : t("calendarEvents.createTitle")
  })}
/>

// Keep old routes for backward compatibility (deprecated)
// Mark with deprecation comments
```

---

## Task 5.12: Update TimelineSection Component

**File**: `CRMOrbit/views/components/TimelineSection.tsx`

**Current State**:
- Tracks changes for: contact, account, organization, note, interaction
- Event types: `contact.created`, `interaction.scheduled`, etc.

**Changes Needed**:
Add support for new calendar event types:
- `calendarEvent.scheduled`
- `calendarEvent.updated`
- `calendarEvent.completed`
- `calendarEvent.canceled`
- `calendarEvent.rescheduled`
- `calendarEvent.deleted`
- `calendarEvent.linked`
- `calendarEvent.unlinked`
- `calendarEvent.recurrence.created/updated/deleted`

**Event Context Resolution**:
```typescript
case "calendarEvent.scheduled":
  return {
    icon: "calendar-outline",
    color: colors.accent,
    label: t("timeline.calendarEvent.scheduled"),
    changes: [
      { field: "type", value: event.payload.type },
      { field: "summary", value: event.payload.summary },
      { field: "scheduledFor", value: formatTimestamp(event.payload.scheduledFor) },
    ],
  };

case "calendarEvent.completed":
  return {
    icon: "checkmark-circle-outline",
    color: colors.success,
    label: t("timeline.calendarEvent.completed"),
    changes: [
      { field: "occurredAt", value: formatTimestamp(event.payload.occurredAt) },
      ...(event.payload.score !== undefined
        ? [{ field: "score", value: `${event.payload.score}%` }]
        : []),
    ],
  };

// ... other event types
```

---

## Testing Checklist

After completing all tasks, verify:

### Navigation
- [ ] CalendarEventForm opens from FAB on Calendar
- [ ] CalendarEventForm opens from "Add Event" buttons
- [ ] CalendarEventForm opens in edit mode from detail screen
- [ ] CalendarEventDetail opens from list, calendar, timeline views
- [ ] CalendarEventsList opens from EventsLanding

### CRUD Operations
- [ ] Create event (all types: meeting, call, email, audit, task, other)
- [ ] Create audit event with account selection
- [ ] Edit event (update fields)
- [ ] Complete event (with occurred date)
- [ ] Cancel event
- [ ] Delete event
- [ ] Reschedule event

### Event Linking
- [ ] Link event to entities (organization, account, contact, note)
- [ ] Unlink event from entities
- [ ] Auto-link on creation (when created from entity detail)
- [ ] View linked entities in detail screen

### Calendar Views
- [ ] Agenda view shows all event types
- [ ] Timeline view shows all event types
- [ ] Marked dates work correctly
- [ ] Quick add modal works
- [ ] Event press navigates to detail

### Entity Detail Views
- [ ] CalendarEventsSection shows events on accounts
- [ ] CalendarEventsSection shows events on organizations
- [ ] CalendarEventsSection shows events on contacts
- [ ] Filter works (show only audits on accounts)
- [ ] Add/Link buttons work

### Timeline/History
- [ ] Timeline shows calendar event changes
- [ ] All event types appear in timeline
- [ ] Field changes displayed correctly

### Audit-Specific
- [ ] Account picker required for audit type
- [ ] Score field visible when completed
- [ ] Floors visited field works
- [ ] Account name displayed as title in lists

### Status Management
- [ ] Status badges show correct colors
- [ ] Scheduled → Completed transition works
- [ ] Scheduled → Canceled transition works
- [ ] Cannot uncomplete/uncancel (expected behavior)

---

## i18n Keys Needed

Add to `CRMOrbit/i18n/locales/en.json`:

```json
{
  "calendarEvent": {
    "type": {
      "meeting": "Meeting",
      "call": "Call",
      "email": "Email",
      "audit": "Audit",
      "task": "Task",
      "reminder": "Reminder",
      "other": "Other"
    },
    "status": {
      "scheduled": "Scheduled",
      "completed": "Completed",
      "canceled": "Canceled"
    }
  },
  "calendarEvents": {
    "listTitle": "Events",
    "detailTitle": "Event Details",
    "createTitle": "Create Event",
    "editTitle": "Edit Event",
    "emptyTitle": "No events yet",
    "emptyHint": "Add your first event to get started",
    "notFound": "Event not found",
    "scheduledFor": "Scheduled for",
    "occurredAt": "Occurred at",
    "statusLabel": "Status",
    "linkedTo": "Linked to",
    "noLinkedEntities": "No linked entities",
    "linkEntityButton": "Link",
    "unlinkButton": "Unlink",
    "unlinkTitle": "Unlink Entity",
    "unlinkConfirmation": "Remove link to {name}?",
    "unlinkAction": "Unlink",
    "deleteButton": "Delete Event",
    "deleteTitle": "Delete Event",
    "deleteConfirmation": "Are you sure you want to delete this event?",
    "deleteError": "Failed to delete event",
    "updateError": "Failed to update event",
    "createError": "Failed to create event",
    "fields": {
      "duration": "Duration",
      "endsAt": "Ends at",
      "score": "Score",
      "floorsVisited": "Floors Visited",
      "description": "Description",
      "location": "Location"
    },
    "form": {
      "typeLabel": "Event Type",
      "accountLabel": "Account",
      "accountPlaceholder": "Select account",
      "accountPickerTitle": "Select Account",
      "accountEmptyHint": "No accounts available",
      "statusLabel": "Status",
      "scheduledForLabel": "Scheduled For",
      "occurredAtLabel": "Occurred At",
      "durationLabel": "Duration",
      "durationHint": "Optional",
      "summaryLabel": "Summary",
      "summaryPlaceholder": "Enter event summary",
      "descriptionLabel": "Description",
      "descriptionPlaceholder": "Enter additional details",
      "locationLabel": "Location",
      "locationPlaceholder": "Enter location",
      "scoreLabel": "Score",
      "scorePlaceholder": "Enter score (0-100)",
      "floorsVisitedLabel": "Floors Visited",
      "floorsVisitedPlaceholder": "e.g. 1, 2, 3",
      "createButton": "Create Event",
      "updateButton": "Update Event"
    },
    "validation": {
      "summaryRequired": "Summary is required",
      "scheduledForRequired": "Scheduled date is required",
      "durationInvalid": "Duration must be a positive number",
      "accountRequired": "Account is required for audit events",
      "scoreInvalid": "Score must be between 0 and 100",
      "floorsInvalid": "Invalid floors format (use comma-separated numbers)"
    }
  },
  "timeline": {
    "calendarEvent": {
      "scheduled": "Event scheduled",
      "updated": "Event updated",
      "completed": "Event completed",
      "canceled": "Event canceled",
      "rescheduled": "Event rescheduled",
      "deleted": "Event deleted",
      "linked": "Event linked",
      "unlinked": "Event unlinked"
    }
  }
}
```

---

## Estimated Effort

- **Task 5.5-5.6**: CalendarView/TimelineView updates (~2-3 hours)
- **Task 5.7**: CalendarScreen update (~30 min)
- **Task 5.8**: CalendarEventsSection component (~1-2 hours)
- **Task 5.9**: LinkEntityModal updates (~1 hour)
- **Task 5.10**: EventsLandingScreen update (~30 min)
- **Task 5.11**: EventsStack navigation (~30 min)
- **Task 5.12**: TimelineSection updates (~1 hour)
- **Testing**: (~2-3 hours)

**Total: 8-12 hours**

---

## Notes

- All deprecated screens (InteractionForm, AuditForm, etc.) should remain functional during migration
- New screens are standalone and don't break existing functionality
- Migration can be done incrementally
- Full cutover happens in Phase 7 (data migration)
- After data migration, deprecated screens can be removed
