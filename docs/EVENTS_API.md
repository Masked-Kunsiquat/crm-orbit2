# Events API Documentation

Documentation for the events database modules for UI development, including core events, reminders, and recurring event management.

## Import

```javascript
import { createEventsDB } from '../database/events';
import { createEventsRemindersDB } from '../database/eventsReminders';
import { createEventsRecurringDB } from '../database/eventsRecurring';

// Initialize with database context
const eventsAPI = createEventsDB({ execute, batch, transaction });
const remindersAPI = createEventsRemindersDB({ execute, batch, transaction });
const recurringAPI = createEventsRecurringDB({ execute, batch, transaction });
```

## Data Structures

### Event Object
```javascript
{
  id: number,                    // Auto-generated primary key
  contact_id: number,            // Required - Foreign key to contacts table
  title: string,                 // Required - Event title/description
  event_type: string,            // Required - 'birthday', 'anniversary', 'meeting', 'follow_up'
  event_date: string,            // Required - Date in YYYY-MM-DD format
  recurring: boolean,            // Whether event repeats (default false)
  recurrence_pattern: string | null, // 'yearly' | 'monthly' | null
  notes: string | null,          // Optional notes about the event
  created_at: string,            // Auto-generated ISO datetime
  updated_at: string             // Auto-updated ISO datetime
}
```

### Event Input (for create/update)
```javascript
{
  contact_id: number,            // Required
  title: string,                 // Required
  event_type: string,            // Required - 'birthday', 'anniversary', 'meeting', 'follow_up'
  event_date: string,            // Required - YYYY-MM-DD format
  recurring?: boolean,           // Optional, defaults to false
  recurrence_pattern?: string,   // Optional - 'yearly' | 'monthly'
  notes?: string                 // Optional
}
```

### Reminder Object
```javascript
{
  id: number,                    // Auto-generated primary key
  event_id: number,              // Required - Foreign key to events table
  reminder_datetime: string,     // Required - SQLite datetime (YYYY-MM-DD HH:MM:SS)
  reminder_type: string | null,  // Optional - reminder category/type
  is_sent: boolean,              // Whether reminder notification was sent
  notification_id: string | null, // Expo notification ID when scheduled
  created_at: string,            // Auto-generated ISO datetime
  updated_at: string             // Auto-updated ISO datetime
}
```

### Reminder Input (for create/update)
```javascript
{
  event_id: number,              // Required
  reminder_datetime: string | Date, // Required - ISO string or Date object
  reminder_type?: string,        // Optional
  is_sent?: boolean              // Optional, defaults to false
}
```

## Core Events API

### Create Event
```javascript
const newEvent = await eventsAPI.create({
  contact_id: 1,
  title: "Birthday Party",
  event_type: "birthday",
  event_date: "2024-03-15",
  recurring: true,
  recurrence_pattern: "yearly",
  notes: "Remember to bring cake!"
});
```

### Get Event by ID
```javascript
const event = await eventsAPI.getById(eventId);
// Returns event object or null if not found
```

### Get All Events
```javascript
const events = await eventsAPI.getAll({
  limit: 50,           // Default 50
  offset: 0,           // Default 0
  orderBy: 'event_date', // 'event_date' | 'title' | 'event_type' | 'created_at'
  orderDir: 'ASC'      // 'ASC' | 'DESC'
});
```

### Update Event
```javascript
const updatedEvent = await eventsAPI.update(eventId, {
  title: "Updated Birthday Party",
  notes: "Changed venue to park",
  event_date: "2024-03-16"
});
```

### Delete Event
```javascript
const rowsDeleted = await eventsAPI.delete(eventId);
// Returns number of rows deleted (0 or 1)
```

### Get Events by Contact
```javascript
const contactEvents = await eventsAPI.getByContact(contactId, {
  limit: 20,
  orderBy: 'event_date',
  orderDir: 'DESC'
});
```

### Get Upcoming Events
```javascript
const upcomingEvents = await eventsAPI.getUpcoming({
  days: 30,   // Look ahead 30 days (default)
  limit: 50,
  offset: 0
});
```

### Get Past Events
```javascript
const pastEvents = await eventsAPI.getPast({
  days: 30,   // Look back 30 days (default)
  limit: 50,
  offset: 0
});
```

### Get Events by Date Range
```javascript
const rangeEvents = await eventsAPI.getByDateRange(
  "2024-01-01",
  "2024-12-31",
  {
    limit: 100,
    orderBy: 'event_date',
    orderDir: 'ASC'
  }
);
```

### Get Events by Type
```javascript
const birthdayEvents = await eventsAPI.getByType("birthday", {
  limit: 50,
  orderBy: 'event_date'
});
```

## Event Reminders API

### Create Event with Reminders
```javascript
const eventWithReminders = await remindersAPI.createEventWithReminders(
  {
    contact_id: 1,
    title: "Annual Review Meeting",
    event_type: "meeting",
    event_date: "2024-06-15",
    notes: "Performance review discussion"
  },
  [
    {
      reminder_datetime: "2024-06-14 09:00:00",
      reminder_type: "day_before"
    },
    {
      reminder_datetime: "2024-06-15 08:30:00",
      reminder_type: "morning_of"
    }
  ]
);
```

### Get Event Reminders
```javascript
const reminders = await remindersAPI.getEventReminders(eventId);
// Returns array of reminder objects sorted by reminder_datetime
```

### Create Single Reminder
```javascript
const reminder = await remindersAPI.createReminder({
  event_id: eventId,
  reminder_datetime: "2024-03-15 10:00:00",
  reminder_type: "custom"
});
```

### Update Event Reminders (Replace All)
```javascript
const updatedReminders = await remindersAPI.updateEventReminders(eventId, [
  {
    reminder_datetime: "2024-03-14 18:00:00",
    reminder_type: "evening_before"
  },
  {
    reminder_datetime: "2024-03-15 09:00:00",
    reminder_type: "morning_of"
  }
]);
```

### Delete Reminder
```javascript
const deleted = await remindersAPI.deleteReminder(reminderId);
// Returns number of rows deleted
```

### Mark Reminder as Sent
```javascript
const sentReminder = await remindersAPI.markReminderSent(reminderId);
// Returns updated reminder object
```

### Get Pending Reminders
```javascript
const pendingReminders = await remindersAPI.getPendingReminders(
  "2024-03-15 12:00:00", // Before this datetime (optional, defaults to now)
  100,                   // Limit (optional, default 100)
  0                      // Offset (optional, default 0)
);
// Returns reminders with event and contact details
```

### Get Upcoming Reminders
```javascript
const upcomingReminders = await remindersAPI.getUpcomingReminders(
  24,  // Hours to look ahead (default 24)
  50,  // Limit (default 100)
  0    // Offset (default 0)
);
```

### Get Unsent Reminders by Event
```javascript
const unsentReminders = await remindersAPI.getUnsentRemindersByEvent(eventId);
```

### Update Reminder DateTime
```javascript
const updatedReminder = await remindersAPI.updateReminderDateTime(
  reminderId,
  "2024-03-15 14:30:00" // New datetime
);
```

### Mark Reminders as Scheduled (Batch)
```javascript
const scheduled = await remindersAPI.markRemindersScheduled([
  { reminderId: 1, notificationId: "expo-notification-1" },
  { reminderId: 2, notificationId: "expo-notification-2" }
]);
// Returns number of reminders marked as scheduled
```

### Mark Reminders as Failed (Batch)
```javascript
const failed = await remindersAPI.markRemindersFailed([1, 2, 3]);
// Returns number of reminders marked as failed
```

## Recurring Events API

### Get Next Occurrence
```javascript
const nextOccurrence = await recurringAPI.getNextOccurrence(
  eventId,
  "2024-03-01" // From date (optional, defaults to today)
);
// Returns event object with calculated next occurrence date or null
```

### Get All Recurring Events
```javascript
const recurringEvents = await recurringAPI.getRecurringEvents({
  limit: 100,
  offset: 0
});
// Returns events with next_occurrence field calculated
```

### Get Today's Birthdays
```javascript
const todaysBirthdays = await recurringAPI.getTodaysBirthdays();
// Returns birthday events occurring today with contact details
```

### Get Upcoming Birthdays
```javascript
const upcomingBirthdays = await recurringAPI.getUpcomingBirthdays(30); // Next 30 days
// Returns birthdays with next_occurrence and days_until fields
```

### Get Upcoming Recurring Events
```javascript
const upcomingRecurring = await recurringAPI.getUpcomingRecurring(14); // Next 14 days
// Returns all recurring events with next_occurrence and days_until fields
```

## Usage Examples for UI Components

### Event Calendar Component
```javascript
import { useEffect, useState } from 'react';
import { initDatabase } from '../database';

function EventCalendar({ selectedDate }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCalendarEvents() {
      try {
        const db = await initDatabase();
        const eventsAPI = db.events;

        // Get events for the selected month
        const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

        const monthEvents = await eventsAPI.getByDateRange(
          startOfMonth.toISOString().split('T')[0],
          endOfMonth.toISOString().split('T')[0]
        );

        setEvents(monthEvents);
      } catch (error) {
        console.error('Failed to load calendar events:', error);
      } finally {
        setLoading(false);
      }
    }

    loadCalendarEvents();
  }, [selectedDate]);

  // Render calendar with events...
}
```

### Create Event Form with Reminders
```javascript
async function handleCreateEvent(formData) {
  try {
    const db = await initDatabase();
    const remindersAPI = db.eventsReminders;

    const eventData = {
      contact_id: formData.contactId,
      title: formData.title,
      event_type: formData.eventType,
      event_date: formData.eventDate,
      recurring: formData.isRecurring,
      recurrence_pattern: formData.recurrencePattern,
      notes: formData.notes
    };

    const reminders = formData.reminders.map(reminder => ({
      reminder_datetime: reminder.datetime,
      reminder_type: reminder.type
    }));

    const newEvent = await remindersAPI.createEventWithReminders(eventData, reminders);
    console.log('Event created with reminders:', newEvent);

    // Navigate to event details or update UI
  } catch (error) {
    console.error('Failed to create event:', error);
    // Show error message to user
  }
}
```

### Birthday Dashboard Component
```javascript
function BirthdayDashboard() {
  const [todaysBirthdays, setTodaysBirthdays] = useState([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState([]);

  useEffect(() => {
    async function loadBirthdays() {
      try {
        const db = await initDatabase();
        const recurringAPI = db.eventsRecurring;

        const [today, upcoming] = await Promise.all([
          recurringAPI.getTodaysBirthdays(),
          recurringAPI.getUpcomingBirthdays(30)
        ]);

        setTodaysBirthdays(today);
        setUpcomingBirthdays(upcoming);
      } catch (error) {
        console.error('Failed to load birthdays:', error);
      }
    }

    loadBirthdays();
  }, []);

  // Render birthday widgets...
}
```

### Reminder Management Component
```javascript
function ReminderManager({ eventId }) {
  const [reminders, setReminders] = useState([]);

  useEffect(() => {
    async function loadReminders() {
      try {
        const db = await initDatabase();
        const remindersAPI = db.eventsReminders;
        const eventReminders = await remindersAPI.getEventReminders(eventId);
        setReminders(eventReminders);
      } catch (error) {
        console.error('Failed to load reminders:', error);
      }
    }

    loadReminders();
  }, [eventId]);

  async function addReminder(reminderData) {
    try {
      const db = await initDatabase();
      const remindersAPI = db.eventsReminders;
      const newReminder = await remindersAPI.createReminder({
        event_id: eventId,
        ...reminderData
      });
      setReminders(prev => [...prev, newReminder]);
    } catch (error) {
      console.error('Failed to add reminder:', error);
    }
  }

  async function deleteReminder(reminderId) {
    try {
      const db = await initDatabase();
      const remindersAPI = db.eventsReminders;
      await remindersAPI.deleteReminder(reminderId);
      setReminders(prev => prev.filter(r => r.id !== reminderId));
    } catch (error) {
      console.error('Failed to delete reminder:', error);
    }
  }

  // Render reminder list and management UI...
}
```

### Event Search and Filter Component
```javascript
function EventSearch() {
  const [events, setEvents] = useState([]);
  const [filters, setFilters] = useState({
    eventType: '',
    dateRange: { start: '', end: '' },
    contactId: null
  });

  async function searchEvents() {
    try {
      const db = await initDatabase();
      const eventsAPI = db.events;

      let results = [];

      if (filters.eventType) {
        results = await eventsAPI.getByType(filters.eventType);
      } else if (filters.dateRange.start && filters.dateRange.end) {
        results = await eventsAPI.getByDateRange(
          filters.dateRange.start,
          filters.dateRange.end
        );
      } else if (filters.contactId) {
        results = await eventsAPI.getByContact(filters.contactId);
      } else {
        results = await eventsAPI.getAll({ limit: 100 });
      }

      setEvents(results);
    } catch (error) {
      console.error('Failed to search events:', error);
    }
  }

  // Render search form and results...
}
```

### Upcoming Events Widget
```javascript
function UpcomingEventsWidget() {
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [pendingReminders, setPendingReminders] = useState([]);

  useEffect(() => {
    async function loadUpcoming() {
      try {
        const db = await initDatabase();
        const eventsAPI = db.events;
        const remindersAPI = db.eventsReminders;

        const [events, reminders] = await Promise.all([
          eventsAPI.getUpcoming({ days: 7, limit: 10 }),
          remindersAPI.getUpcomingReminders(24) // Next 24 hours
        ]);

        setUpcomingEvents(events);
        setPendingReminders(reminders);
      } catch (error) {
        console.error('Failed to load upcoming items:', error);
      }
    }

    loadUpcoming();

    // Set up periodic refresh for reminders
    const interval = setInterval(loadUpcoming, 5 * 60 * 1000); // Every 5 minutes
    return () => clearInterval(interval);
  }, []);

  // Render upcoming events and reminders...
}
```

## Error Handling

All methods may throw `DatabaseError` with the following structure:
```javascript
{
  message: string,     // Human-readable error message
  code: string,        // Error code (e.g., 'NOT_FOUND', 'VALIDATION_ERROR')
  originalError: Error // Original underlying error
}
```

Common error codes:
- `NOT_FOUND` - Event/reminder not found by ID
- `VALIDATION_ERROR` - Invalid input data (missing required fields, invalid dates)
- `CREATE_FAILED` - Failed to create event/reminder
- `UPDATE_FAILED` - Failed to update event/reminder
- `TRANSACTION_REQUIRED` - Method requires transaction support
- `DATABASE_ERROR` - General database operation error

## Integration Notes

### Event Types
Standard event types supported:
- `birthday` - Birthday events (typically recurring yearly)
- `anniversary` - Anniversary events (typically recurring yearly)
- `meeting` - Meeting events (usually one-time)
- `follow_up` - Follow-up reminders (usually one-time)

### Recurring Patterns
- `yearly` - Event repeats every year on the same date
- `monthly` - Event repeats every month on the same day
- Handle leap year dates appropriately (Feb 29 → Feb 28 on non-leap years)

### Date Formats
- **Event dates**: Use YYYY-MM-DD format for `event_date`
- **Reminder datetimes**: Use YYYY-MM-DD HH:MM:SS format for `reminder_datetime`
- **Input flexibility**: Reminder API accepts Date objects or ISO strings

### Contact Integration
- All events must be linked to a contact via `contact_id`
- Creating/updating events automatically updates contact's `last_interaction_at`
- Use contact details in reminder notifications

### Notification Integration
- Reminders can be linked to Expo notifications via `notification_id`
- Use `markRemindersScheduled()` when notifications are successfully scheduled
- Use `markRemindersFailed()` when notification scheduling fails
- Query pending reminders for notification system processing

## Notes for UI Development

1. **Date Handling**: Always use consistent date formats (YYYY-MM-DD for events, YYYY-MM-DD HH:MM:SS for reminders)
2. **Recurring Events**: Use the recurring API to calculate next occurrences for calendar displays
3. **Birthday Management**: Use specialized birthday methods for age calculations and birthday widgets
4. **Reminder Scheduling**: Integrate with notification service for reminder delivery
5. **Transaction Usage**: Use transaction-based methods for creating events with reminders
6. **Pagination**: Use `limit` and `offset` for large event lists
7. **Performance**: Batch reminder operations when possible using provided batch methods
8. **Error Recovery**: Handle foreign key errors gracefully (contact not found)
9. **Date Validation**: Validate date formats before sending to API
10. **Contact Updates**: Events automatically update contact interaction timestamps