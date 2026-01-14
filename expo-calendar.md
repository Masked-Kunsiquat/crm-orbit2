# Calendar

_A library that provides an API for interacting with the device's system calendars, events, reminders, and associated records._

Available on platforms android, ios

`expo-calendar` provides an API for interacting with the device's system calendars, events, reminders, and associated records.

Additionally, it provides methods to launch the [system-provided calendar UI](#launching-system-provided-calendar-dialogs) to allow user view or edit events. On Android, these methods start the system calendar app using an Intent. On iOS, they present either [`EKEventViewController`](https://developer.apple.com/documentation/eventkitui/ekeventviewcontroller) or [`EKEventEditViewController`](https://developer.apple.com/documentation/eventkitui/ekeventeditviewcontroller) as a modal.

## Installation

```bash
$ npx expo install expo-calendar
```

If you are installing this in an existing React Native app, make sure to install `expo` in your project.

## Configuration in app config

You can configure `expo-calendar` using its built-in [config plugin](https://docs.expo.dev/config-plugins/introduction/) if you use config plugins in your project ([Continuous Native Generation (CNG)](https://docs.expo.dev/workflow/continuous-native-generation/)). The plugin allows you to configure various properties that cannot be set at runtime and require building a new app binary to take effect. If your app does **not** use CNG, then you'll need to manually configure the library.

```json app.json
{
  "expo": {
    "plugins": [
      [
        "expo-calendar",
        {
          "calendarPermission": "The app needs to access your calendar."
        }
      ]
    ]
  }
}
```

### Configurable properties
| Name | Default | Description |
| --- | --- | --- |
| `calendarPermission` | `"Allow $(PRODUCT_NAME) to access your calendar"` | Only for: ios. A string to set the [`NSCalendarsUsageDescription`](#ios) permission message. |
| `remindersPermission` | `"Allow $(PRODUCT_NAME) to access your reminders"` | Only for: ios. A string to set the [`NSRemindersUsageDescription`](#ios) permission message. |

<ConfigReactNative>

If you're not using Continuous Native Generation ([CNG](https://docs.expo.dev/workflow/continuous-native-generation/)) (you're using native **android** and **ios** projects manually), then you need to configure following permissions in your native projects:

- For Android, add `android.permission.READ_CALENDAR` and `android.permission.WRITE_CALENDAR` permissions to your project's **android/app/src/main/AndroidManifest.xml**:

  ```xml
  <uses-permission android:name="android.permission.READ_CALENDAR" />
  <uses-permission android:name="android.permission.WRITE_CALENDAR" />
  ```

- For iOS, add `NSCalendarsUsageDescription` and `NSRemindersUsageDescription` to your project's **ios/[app]/Info.plist**:

  ```xml
  <key>NSCalendarsUsageDescription</key>
  <string>Allow $(PRODUCT_NAME) to access your calendar</string>
  <key>NSRemindersUsageDescription</key>
  <string>Allow $(PRODUCT_NAME) to access your reminders</string>
  ```

</ConfigReactNative>

## Usage

```jsx
import { useEffect } from 'react';
import { StyleSheet, View, Text, Button, Platform } from 'react-native';
import * as Calendar from 'expo-calendar';

export default function App() {
  useEffect(() => {
    (async () => {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status === 'granted') {
        const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        console.log('Here are all your calendars:');
        console.log({ calendars });
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Text>Calendar Module Example</Text>
      <Button title="Create a new calendar" onPress={createCalendar} />
    </View>
  );
}

async function getDefaultCalendarSource() {
  const defaultCalendar = await Calendar.getDefaultCalendarAsync();
  return defaultCalendar.source;
}

async function createCalendar() {
  const defaultCalendarSource =
    Platform.OS === 'ios'
      ? await getDefaultCalendarSource()
      : { isLocalAccount: true, name: 'Expo Calendar' };
  const newCalendarID = await Calendar.createCalendarAsync({
    title: 'Expo Calendar',
    color: 'blue',
    entityType: Calendar.EntityTypes.EVENT,
    sourceId: defaultCalendarSource.id,
    source: defaultCalendarSource,
    name: 'internalCalendarName',
    ownerAccount: 'personal',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });
  console.log(`Your new calendar ID is: ${newCalendarID}`);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
});
```

## API

```js
import * as Calendar from 'expo-calendar';
```

## API: expo-calendar

### Launching system-provided calendar dialogs

#### createEventInCalendarAsync (*Function*)
- `createEventInCalendarAsync(eventData: Omit<Partial<Event>, 'id'>, presentationOptions?: PresentationOptions): Promise<DialogEventResult>`
  Launches the calendar UI provided by the OS to create a new event.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `eventData` | Omit<Partial<Event>, 'id'> | A map of details for the event to be created. |
  | `presentationOptions` *(optional)* | PresentationOptions | Configuration that influences how the calendar UI is presented. |
  Returns: A promise which resolves with information about the dialog result.

#### editEventInCalendarAsync (*Function*)
- `editEventInCalendarAsync(params: CalendarDialogParams, presentationOptions?: PresentationOptions): Promise<DialogEventResult>`
  Launches the calendar UI provided by the OS to edit or delete an event. On Android, this is the same as `openEventInCalendarAsync`.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `params` | CalendarDialogParams | - |
  | `presentationOptions` *(optional)* | PresentationOptions | - |
  Returns: A promise which resolves with information about the dialog result.

#### openEventInCalendar (*Function*)
- `openEventInCalendar(id: string)`
  Sends an intent to open the specified event in the OS Calendar app.
  Available on platform: android
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `id` | string | ID of the event to open. |

#### openEventInCalendarAsync (*Function*)
- `openEventInCalendarAsync(params: CalendarDialogParams, presentationOptions?: OpenEventPresentationOptions): Promise<OpenEventDialogResult>`
  Launches the calendar UI provided by the OS to preview an event.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `params` | CalendarDialogParams | - |
  | `presentationOptions` *(optional)* | OpenEventPresentationOptions | - |
  Returns: A promise which resolves with information about the dialog result.

### Hooks

#### useCalendarPermissions (*Function*)
Check or request permissions to access the calendar.
This uses both `getCalendarPermissionsAsync` and `requestCalendarPermissionsAsync` to interact
with the permissions.
- `useCalendarPermissions(options?: PermissionHookOptions<object>): [null | PermissionResponse, RequestPermissionMethod<PermissionResponse>, GetPermissionMethod<PermissionResponse>]`
  Check or request permissions to access the calendar.
  This uses both `getCalendarPermissionsAsync` and `requestCalendarPermissionsAsync` to interact
  with the permissions.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `options` *(optional)* | PermissionHookOptions<object> | - |
  Example:
  ```ts
  const [status, requestPermission] = Calendar.useCalendarPermissions();
  ```

#### useRemindersPermissions (*Function*)
Check or request permissions to access reminders.
This uses both `getRemindersPermissionsAsync` and `requestRemindersPermissionsAsync` to interact
with the permissions.
- `useRemindersPermissions(options?: PermissionHookOptions<object>): [null | PermissionResponse, RequestPermissionMethod<PermissionResponse>, GetPermissionMethod<PermissionResponse>]`
  Check or request permissions to access reminders.
  This uses both `getRemindersPermissionsAsync` and `requestRemindersPermissionsAsync` to interact
  with the permissions.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `options` *(optional)* | PermissionHookOptions<object> | - |
  Example:
  ```ts
  const [status, requestPermission] = Calendar.useRemindersPermissions();
  ```

### Calendar Methods

#### createAttendeeAsync (*Function*)
- `createAttendeeAsync(eventId: string, details: Partial<Attendee>): Promise<string>`
  Creates a new attendee record and adds it to the specified event. Note that if `eventId` specifies
  a recurring event, this will add the attendee to every instance of the event.
  Available on platform: android
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `eventId` | string | ID of the event to add this attendee to. |
  | `details` | Partial<Attendee> | A map of details for the attendee to be created. |
  Returns: A string representing the ID of the newly created attendee record.

#### createCalendarAsync (*Function*)
- `createCalendarAsync(details: Partial<Calendar>): Promise<string>`
  Creates a new calendar on the device, allowing events to be added later and displayed in the OS Calendar app.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `details` | Partial<Calendar> | A map of details for the calendar to be created. |
  Returns: A string representing the ID of the newly created calendar.

#### createEventAsync (*Function*)
- `createEventAsync(calendarId: string, eventData: Omit<Partial<Event>, 'id' | 'organizer'>): Promise<string>`
  Creates a new event on the specified calendar.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `calendarId` | string | ID of the calendar to create this event in. |
  | `eventData` | Omit<Partial<Event>, 'id' \| 'organizer'> | A map of details for the event to be created. |
  Returns: A promise which fulfils with a string representing the ID of the newly created event.

#### createReminderAsync (*Function*)
- `createReminderAsync(calendarId: null | string, reminder: Reminder): Promise<string>`
  Creates a new reminder on the specified calendar.
  Available on platform: ios
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `calendarId` | null \| string | ID of the calendar to create this reminder in (or `null` to add the calendar to<br>the OS-specified default calendar for reminders). |
  | `reminder` | Reminder | A map of details for the reminder to be created |
  Returns: A promise which fulfils with a string representing the ID of the newly created reminder.

#### deleteAttendeeAsync (*Function*)
- `deleteAttendeeAsync(id: string): Promise<void>`
  Deletes an existing attendee record from the device. __Use with caution.__
  Available on platform: android
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `id` | string | ID of the attendee to delete. |

#### deleteCalendarAsync (*Function*)
- `deleteCalendarAsync(id: string): Promise<void>`
  Deletes an existing calendar and all associated events/reminders/attendees from the device. __Use with caution.__
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `id` | string | ID of the calendar to delete. |

#### deleteEventAsync (*Function*)
- `deleteEventAsync(id: string, recurringEventOptions: RecurringEventOptions): Promise<void>`
  Deletes an existing event from the device. Use with caution.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `id` | string | ID of the event to be deleted. |
  | `recurringEventOptions` | RecurringEventOptions | A map of options for recurring events. |

#### deleteReminderAsync (*Function*)
- `deleteReminderAsync(id: string): Promise<void>`
  Deletes an existing reminder from the device. __Use with caution.__
  Available on platform: ios
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `id` | string | ID of the reminder to be deleted. |

#### getAttendeesForEventAsync (*Function*)
- `getAttendeesForEventAsync(id: string, recurringEventOptions: RecurringEventOptions): Promise<Attendee[]>`
  Gets all attendees for a given event (or instance of a recurring event).
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `id` | string | ID of the event to return attendees for. |
  | `recurringEventOptions` | RecurringEventOptions | A map of options for recurring events. |
  Returns: A promise which fulfils with an array of [`Attendee`](#attendee) associated with the
  specified event.

#### getCalendarPermissionsAsync (*Function*)
- `getCalendarPermissionsAsync(): Promise<PermissionResponse>`
  Checks user's permissions for accessing user's calendars.
  Returns: A promise that resolves to an object of type [`PermissionResponse`](#permissionresponse).

#### getCalendarsAsync (*Function*)
- `getCalendarsAsync(entityType?: string): Promise<Calendar[]>`
  Gets an array of calendar objects with details about the different calendars stored on the device.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `entityType` *(optional)* | string | __iOS Only.__ Not required, but if defined, filters the returned calendars to<br>a specific entity type. Possible values are `Calendar.EntityTypes.EVENT` (for calendars shown in<br>the Calendar app) and `Calendar.EntityTypes.REMINDER` (for the Reminders app).<br>> **Note:** If not defined, you will need both permissions: **CALENDAR** and **REMINDERS**. |
  Returns: An array of [calendar objects](#calendar 'Calendar') matching the provided entity type (if provided).

#### getDefaultCalendarAsync (*Function*)
- `getDefaultCalendarAsync(): Promise<Calendar>`
  Gets an instance of the default calendar object.
  Available on platform: ios
  Returns: A promise resolving to the [Calendar](#calendar) object that is the user's default calendar.

#### getEventAsync (*Function*)
- `getEventAsync(id: string, recurringEventOptions: RecurringEventOptions): Promise<Event>`
  Returns a specific event selected by ID. If a specific instance of a recurring event is desired,
  the start date of this instance must also be provided, as instances of recurring events do not
  have their own unique and stable IDs on either iOS or Android.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `id` | string | ID of the event to return. |
  | `recurringEventOptions` | RecurringEventOptions | A map of options for recurring events. |
  Returns: A promise which fulfils with an [`Event`](#event) object matching the provided criteria, if one exists.

#### getEventsAsync (*Function*)
- `getEventsAsync(calendarIds: string[], startDate: Date, endDate: Date): Promise<Event[]>`
  Returns all events in a given set of calendars over a specified time period. The filtering has
  slightly different behavior per-platform - on iOS, all events that overlap at all with the
  `[startDate, endDate]` interval are returned, whereas on Android, only events that begin on or
  after the `startDate` and end on or before the `endDate` will be returned.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `calendarIds` | string[] | Array of IDs of calendars to search for events in. |
  | `startDate` | Date | Beginning of time period to search for events in. |
  | `endDate` | Date | End of time period to search for events in. |
  Returns: A promise which fulfils with an array of [`Event`](#event) objects matching the search criteria.

#### getReminderAsync (*Function*)
- `getReminderAsync(id: string): Promise<Reminder>`
  Returns a specific reminder selected by ID.
  Available on platform: ios
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `id` | string | ID of the reminder to return. |
  Returns: A promise which fulfils with a [`Reminder`](#reminder) matching the provided ID, if one exists.

#### getRemindersAsync (*Function*)
- `getRemindersAsync(calendarIds: null | string[], status: null | ReminderStatus, startDate: null | Date, endDate: null | Date): Promise<Reminder[]>`
  Returns a list of reminders matching the provided criteria. If `startDate` and `endDate` are defined,
  returns all reminders that overlap at all with the [startDate, endDate] interval - i.e. all reminders
  that end after the `startDate` or begin before the `endDate`.
  Available on platform: ios
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `calendarIds` | null \| string[] | Array of IDs of calendars to search for reminders in. |
  | `status` | null \| ReminderStatus | One of `Calendar.ReminderStatus.COMPLETED` or `Calendar.ReminderStatus.INCOMPLETE`. |
  | `startDate` | null \| Date | Beginning of time period to search for reminders in. Required if `status` is defined. |
  | `endDate` | null \| Date | End of time period to search for reminders in. Required if `status` is defined. |
  Returns: A promise which fulfils with an array of [`Reminder`](#reminder) objects matching the search criteria.

#### getRemindersPermissionsAsync (*Function*)
- `getRemindersPermissionsAsync(): Promise<PermissionResponse>`
  Checks user's permissions for accessing user's reminders.
  Available on platform: ios
  Returns: A promise that resolves to an object of type [`PermissionResponse`](#permissionresponse).

#### getSourceAsync (*Function*)
- `getSourceAsync(id: string): Promise<Source>`
  Returns a specific source selected by ID.
  Available on platform: ios
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `id` | string | ID of the source to return. |
  Returns: A promise which fulfils with an array of [`Source`](#source) object matching the provided
  ID, if one exists.

#### getSourcesAsync (*Function*)
- `getSourcesAsync(): Promise<Source[]>`
  Available on platform: ios
  Returns: A promise which fulfils with an array of [`Source`](#source) objects all sources for
  calendars stored on the device.

#### isAvailableAsync (*Function*)
- `isAvailableAsync(): Promise<boolean>`
  Returns whether the Calendar API is enabled on the current device. This does not check the app permissions.
  Returns: Async `boolean`, indicating whether the Calendar API is available on the current device.
  Currently, this resolves `true` on iOS and Android only.

#### requestCalendarPermissionsAsync (*Function*)
- `requestCalendarPermissionsAsync(): Promise<PermissionResponse>`
  Asks the user to grant permissions for accessing user's calendars.
  Returns: A promise that resolves to an object of type [`PermissionResponse`](#permissionresponse).

#### requestPermissionsAsync (*Function*)
- `requestPermissionsAsync(): Promise<PermissionResponse>`

#### requestRemindersPermissionsAsync (*Function*)
- `requestRemindersPermissionsAsync(): Promise<PermissionResponse>`
  Asks the user to grant permissions for accessing user's reminders.
  Available on platform: ios
  Returns: A promise that resolves to an object of type [`PermissionResponse`](#permissionresponse).

#### updateAttendeeAsync (*Function*)
- `updateAttendeeAsync(id: string, details: Partial<Attendee>): Promise<string>`
  Updates an existing attendee record. To remove a property, explicitly set it to `null` in `details`.
  Available on platform: android
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `id` | string | ID of the attendee record to be updated. |
  | `details` | Partial<Attendee> | A map of properties to be updated. |

#### updateCalendarAsync (*Function*)
- `updateCalendarAsync(id: string, details: Partial<Calendar>): Promise<string>`
  Updates the provided details of an existing calendar stored on the device. To remove a property,
  explicitly set it to `null` in `details`.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `id` | string | ID of the calendar to update. |
  | `details` | Partial<Calendar> | A map of properties to be updated. |

#### updateEventAsync (*Function*)
- `updateEventAsync(id: string, details: Omit<Partial<Event>, 'id'>, recurringEventOptions: RecurringEventOptions): Promise<string>`
  Updates the provided details of an existing calendar stored on the device. To remove a property,
  explicitly set it to `null` in `details`.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `id` | string | ID of the event to be updated. |
  | `details` | Omit<Partial<Event>, 'id'> | A map of properties to be updated. |
  | `recurringEventOptions` | RecurringEventOptions | A map of options for recurring events. |

#### updateReminderAsync (*Function*)
- `updateReminderAsync(id: string, details: Reminder): Promise<string>`
  Updates the provided details of an existing reminder stored on the device. To remove a property,
  explicitly set it to `null` in `details`.
  Available on platform: ios
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `id` | string | ID of the reminder to be updated. |
  | `details` | Reminder | A map of properties to be updated. |

### Types

#### Alarm (*Type*)
A method for having the OS automatically remind the user about a calendar item.
| Property | Type | Description |
| --- | --- | --- |
| `absoluteDate` *(optional)* | string | Date object or string representing an absolute time the alarm should occur.<br>Overrides `relativeOffset` and `structuredLocation` if specified alongside either. Available on platform: ios |
| `method` *(optional)* | AlarmMethod | Method of alerting the user that this alarm should use. On iOS this is always a notification. Available on platform: android |
| `relativeOffset` *(optional)* | number | Number of minutes from the `startDate` of the calendar item that the alarm should occur.<br>Use negative values to have the alarm occur before the `startDate`. |
| `structuredLocation` *(optional)* | AlarmLocation | - |

#### AlarmLocation (*Type*)
| Property | Type | Description |
| --- | --- | --- |
| `coords` *(optional)* | { latitude: number; longitude: number } | - |
| `proximity` *(optional)* | string | - |
| `radius` *(optional)* | number | - |
| `title` *(optional)* | string | Available on platform: ios |

#### Attendee (*Type*)
A person or entity that is associated with an event by being invited or fulfilling some other role.
| Property | Type | Description |
| --- | --- | --- |
| `email` *(optional)* | string | Email address of the attendee. Available on platform: android |
| `id` *(optional)* | string | Internal ID that represents this attendee on the device. Available on platform: android |
| `isCurrentUser` *(optional)* | boolean | Indicates whether or not this attendee is the current OS user. Available on platform: ios |
| `name` | string | Displayed name of the attendee. |
| `role` | AttendeeRole | Role of the attendee at the event. |
| `status` | AttendeeStatus | Status of the attendee in relation to the event. |
| `type` | AttendeeType | Type of the attendee. |
| `url` *(optional)* | string | URL for the attendee. Available on platform: ios |

#### Calendar (*Type*)
A calendar record upon which events (or, on iOS, reminders) can be stored. Settings here apply to
the calendar as a whole and how its events are displayed in the OS calendar app.
| Property | Type | Description |
| --- | --- | --- |
| `accessLevel` *(optional)* | CalendarAccessLevel | Level of access that the user has for the calendar. Available on platform: android |
| `allowedAttendeeTypes` *(optional)* | AttendeeType[] | Attendee types that this calendar supports. Available on platform: android |
| `allowedAvailabilities` | Availability[] | Availability types that this calendar supports. |
| `allowedReminders` *(optional)* | AlarmMethod[] | Alarm methods that this calendar supports. Available on platform: android |
| `allowsModifications` | boolean | Boolean value that determines whether this calendar can be modified. |
| `color` | string | Color used to display this calendar's events. |
| `entityType` *(optional)* | EntityTypes | Whether the calendar is used in the Calendar or Reminders OS app. Available on platform: ios |
| `id` | string | Internal ID that represents this calendar on the device. |
| `isPrimary` *(optional)* | boolean | Boolean value indicating whether this is the device's primary calendar. Available on platform: android |
| `isSynced` *(optional)* | boolean | Indicates whether this calendar is synced and its events stored on the device.<br>Unexpected behavior may occur if this is not set to `true`. Available on platform: android |
| `isVisible` *(optional)* | boolean | Indicates whether the OS displays events on this calendar. Available on platform: android |
| `name` *(optional)* | string \| null | Internal system name of the calendar. Available on platform: android |
| `ownerAccount` *(optional)* | string | Name for the account that owns this calendar. Available on platform: android |
| `source` | Source | Object representing the source to be used for the calendar. |
| `sourceId` *(optional)* | string | ID of the source to be used for the calendar. Likely the same as the source for any other<br>locally stored calendars. Available on platform: ios |
| `timeZone` *(optional)* | string | Time zone for the calendar. Available on platform: android |
| `title` | string | Visible name of the calendar. |
| `type` *(optional)* | CalendarType | Type of calendar this object represents. Available on platform: ios |

#### CalendarDialogParams (*Type*)
| Property | Type | Description |
| --- | --- | --- |
| `id` | string | ID of the event to be presented in the calendar UI. |
| `instanceStartDate` *(optional)* | string \| Date | Date object representing the start time of the desired instance, if looking for a single instance<br>of a recurring event. If this is not provided and **id** represents a recurring event, the first<br>instance of that event will be returned by default. Available on platform: ios |

#### DaysOfTheWeek (*Type*)
Available on platform: ios
| Property | Type | Description |
| --- | --- | --- |
| `dayOfTheWeek` | DayOfTheWeek | Sunday to Saturday - `DayOfTheWeek` enum. |
| `weekNumber` *(optional)* | number | `-53` to `53` (`0` ignores this field, and a negative indicates a value from the end of the range). |

#### DialogEventResult (*Type*)
The result of presenting a calendar dialog for creating or editing an event.
| Property | Type | Description |
| --- | --- | --- |
| `action` | Extract<CalendarDialogResultActions, 'done' \| 'saved' \| 'canceled' \| 'deleted'> | How user responded to the dialog.<br>On Android, this is always `done` (Android doesn't provide enough information to determine the user's action -<br>the user may have canceled the dialog, saved or deleted the event).<br><br>On iOS, it can be `saved`, `canceled` or `deleted`. |
| `id` | string \| null | The ID of the event that was created or edited. On Android, this is always `null`.<br><br>On iOS, this is a string when permissions are granted and user confirms the creation or editing of an event. Otherwise, it's `null`. |

#### Event (*Type*)
An event record, or a single instance of a recurring event. On iOS, used in the Calendar app.
| Property | Type | Description |
| --- | --- | --- |
| `accessLevel` *(optional)* | EventAccessLevel | User's access level for the event. Available on platform: android |
| `alarms` | Alarm[] | Array of Alarm objects which control automated reminders to the user. |
| `allDay` | boolean | Whether the event is displayed as an all-day event on the calendar |
| `availability` | Availability | The availability setting for the event. |
| `calendarId` | string | ID of the calendar that contains this event. |
| `creationDate` *(optional)* | string \| Date | Date when the event record was created. Available on platform: ios |
| `endDate` | string \| Date | Date object or string representing the time when the event ends. |
| `endTimeZone` *(optional)* | string | Time zone for the event end time. Available on platform: android |
| `guestsCanInviteOthers` *(optional)* | boolean | Whether invited guests can invite other guests. Available on platform: android |
| `guestsCanModify` *(optional)* | boolean | Whether invited guests can modify the details of the event. Available on platform: android |
| `guestsCanSeeGuests` *(optional)* | boolean | Whether invited guests can see other guests. Available on platform: android |
| `id` | string | Internal ID that represents this event on the device. |
| `instanceId` *(optional)* | string | For instances of recurring events, volatile ID representing this instance. Not guaranteed to<br>always refer to the same instance. Available on platform: android |
| `isDetached` *(optional)* | boolean | Boolean value indicating whether or not the event is a detached (modified) instance of a recurring event. Available on platform: ios |
| `lastModifiedDate` *(optional)* | string \| Date | Date when the event record was last modified. Available on platform: ios |
| `location` | string \| null | Location field of the event. |
| `notes` | string | Description or notes saved with the event. |
| `organizer` *(optional)* | Organizer | Organizer of the event.<br>This property is only available on events associated with calendars that are managed by a service ie. Google Calendar or iCloud.<br>The organizer is read-only and cannot be set. Available on platform: ios |
| `organizerEmail` *(optional)* | string | Email address of the organizer of the event. Available on platform: android |
| `originalId` *(optional)* | string | For detached (modified) instances of recurring events, the ID of the original recurring event. Available on platform: android |
| `originalStartDate` *(optional)* | string \| Date | For recurring events, the start date for the first (original) instance of the event. Available on platform: ios |
| `recurrenceRule` | RecurrenceRule \| null | Object representing rules for recurring or repeating events. Set to `null` for one-time events. |
| `startDate` | string \| Date | Date object or string representing the time when the event starts. |
| `status` | EventStatus | Status of the event. |
| `timeZone` | string | Time zone the event is scheduled in. |
| `title` | string | Visible name of the event. |
| `url` *(optional)* | string | URL for the event. Available on platform: ios |

#### OpenEventDialogResult (*Type*)
The result of presenting the calendar dialog for opening (viewing) an event.
| Property | Type | Description |
| --- | --- | --- |
| `action` | Extract<CalendarDialogResultActions, 'done' \| 'canceled' \| 'deleted' \| 'responded'> | Indicates how user responded to the dialog.<br>On Android, the `action` is always `done`.<br>On iOS, it can be `done`, `canceled`, `deleted` or `responded`. |

#### OpenEventPresentationOptions (*Type*)
| Property | Type | Description |
| --- | --- | --- |
| `allowsCalendarPreview` *(optional)* | boolean | Determines whether event can be shown in calendar day view preview.<br>This property applies only to invitations. Default: `false` Available on platform: ios |
| `allowsEditing` *(optional)* | boolean | Whether to allow the user to edit the previewed event.<br>This property applies only to events in calendars created by the user.<br><br>Note that if the user edits the event, the returned action is the one that user performs last.<br>For example, when user previews the event, confirms some edits and finally dismisses the dialog, the event is edited, but response is `canceled`. Default: `false` Available on platform: ios |

#### PermissionExpiration (*Type*)
Permission expiration time. Currently, all permissions are granted permanently.
Type: 'never' | number

#### PermissionHookOptions (*Type*)
Type: PermissionHookBehavior & Options

#### PermissionResponse (*Type*)
An object obtained by permissions get and request functions.
| Property | Type | Description |
| --- | --- | --- |
| `canAskAgain` | boolean | Indicates if user can be asked again for specific permission.<br>If not, one should be directed to the Settings app<br>in order to enable/disable the permission. |
| `expires` | PermissionExpiration | Determines time when the permission expires. |
| `granted` | boolean | A convenience boolean that indicates if the permission is granted. |
| `status` | PermissionStatus | Determines the status of the permission. |

#### PresentationOptions (*Type*)
| Property | Type | Description |
| --- | --- | --- |
| `startNewActivityTask` *(optional)* | boolean | Whether to launch the Activity as a new [task](https://developer.android.com/reference/android/content/Intent#FLAG_ACTIVITY_NEW_TASK).<br>If `true`, the promise resolves with `'done'` action immediately after opening the calendar activity. Default: `true` Available on platform: android |

#### RecurrenceRule (*Type*)
A recurrence rule for events or reminders, allowing the same calendar item to recur multiple times.
This type is based on [the iOS interface](https://developer.apple.com/documentation/eventkit/ekrecurrencerule/1507320-initrecurrencewithfrequency)
which is in turn based on [the iCal RFC](https://tools.ietf.org/html/rfc5545#section-3.8.5.3)
so you can refer to those to learn more about this potentially complex interface.

Not all the combinations make sense. For example, when frequency is `DAILY`, setting `daysOfTheMonth` makes no sense.
| Property | Type | Description |
| --- | --- | --- |
| `daysOfTheMonth` *(optional)* | number[] | The days of the month this event occurs on.<br>`-31` to `31` (not including `0`). Negative indicates a value from the end of the range.<br>This field is only valid for `Calendar.Frequency.Monthly`. Available on platform: ios |
| `daysOfTheWeek` *(optional)* | DaysOfTheWeek[] | The days of the week the event should recur on. An array of [`DaysOfTheWeek`](#daysoftheweek) object. Available on platform: ios |
| `daysOfTheYear` *(optional)* | number[] | The days of the year this event occurs on.<br>`-366` to `366` (not including `0`). Negative indicates a value from the end of the range.<br>This field is only valid for `Calendar.Frequency.Yearly`. Available on platform: ios |
| `endDate` *(optional)* | string \| Date | Date on which the calendar item should stop recurring; overrides `occurrence` if both are specified. |
| `frequency` | Frequency | How often the calendar item should recur. |
| `interval` *(optional)* | number | Interval at which the calendar item should recur. For example, an `interval: 2` with `frequency: DAILY`<br>would yield an event that recurs every other day. Default: `1` |
| `monthsOfTheYear` *(optional)* | MonthOfTheYear[] | The months this event occurs on.<br>This field is only valid for `Calendar.Frequency.Yearly`. Available on platform: ios |
| `occurrence` *(optional)* | number | Number of times the calendar item should recur before stopping. |
| `setPositions` *(optional)* | number[] | TAn array of numbers that filters which recurrences to include. For example, for an event that<br>recurs every Monday, passing 2 here will make it recur every other Monday.<br>`-366` to `366` (not including `0`). Negative indicates a value from the end of the range.<br>This field is only valid for `Calendar.Frequency.Yearly`. Available on platform: ios |
| `weeksOfTheYear` *(optional)* | number[] | The weeks of the year this event occurs on.<br>`-53` to `53` (not including `0`). Negative indicates a value from the end of the range.<br>This field is only valid for `Calendar.Frequency.Yearly`. Available on platform: ios |

#### RecurringEventOptions (*Type*)
Available on platform: ios
| Property | Type | Description |
| --- | --- | --- |
| `futureEvents` *(optional)* | boolean | Whether future events in the recurring series should also be updated. If `true`, will<br>apply the given changes to the recurring instance specified by `instanceStartDate` and all<br>future events in the series. If `false`, will only apply the given changes to the instance<br>specified by `instanceStartDate`. |
| `instanceStartDate` *(optional)* | string \| Date | Date object representing the start time of the desired instance, if looking for a single instance<br>of a recurring event. If this is not provided and **id** represents a recurring event, the first<br>instance of that event will be returned by default. |

#### Reminder (*Type*)
A reminder record, used in the iOS Reminders app. No direct analog on Android.
Available on platform: ios
| Property | Type | Description |
| --- | --- | --- |
| `alarms` *(optional)* | Alarm[] | Array of Alarm objects which control automated alarms to the user about the task. |
| `calendarId` *(optional)* | string | ID of the calendar that contains this reminder. |
| `completed` *(optional)* | boolean | Indicates whether or not the task has been completed. |
| `completionDate` *(optional)* | string \| Date | Date object or string representing the date of completion, if `completed` is `true`.<br>Setting this property of a nonnull `Date` will automatically set the reminder's `completed` value to `true`. |
| `creationDate` *(optional)* | string \| Date | Date when the reminder record was created. |
| `dueDate` *(optional)* | string \| Date | Date object or string representing the time when the reminder task is due. |
| `id` *(optional)* | string | Internal ID that represents this reminder on the device. |
| `lastModifiedDate` *(optional)* | string \| Date | Date when the reminder record was last modified. |
| `location` *(optional)* | string | Location field of the reminder |
| `notes` *(optional)* | string | Description or notes saved with the reminder. |
| `recurrenceRule` *(optional)* | RecurrenceRule \| null | Object representing rules for recurring or repeated reminders. `null` for one-time tasks. |
| `startDate` *(optional)* | string \| Date | Date object or string representing the start date of the reminder task. |
| `timeZone` *(optional)* | string | Time zone the reminder is scheduled in. |
| `title` *(optional)* | string | Visible name of the reminder. |
| `url` *(optional)* | string | URL for the reminder. |

#### Source (*Type*)
A source account that owns a particular calendar. Expo apps will typically not need to interact with `Source` objects.
| Property | Type | Description |
| --- | --- | --- |
| `id` *(optional)* | string | Internal ID that represents this source on the device. Available on platform: ios |
| `isLocalAccount` *(optional)* | boolean | Whether this source is the local phone account. Must be `true` if `type` is `undefined`. Available on platform: android |
| `name` | string | Name for the account that owns this calendar and was used to sync the calendar to the device. |
| `type` | string \| SourceType | Type of the account that owns this calendar and was used to sync it to the device.<br>If `isLocalAccount` is falsy then this must be defined, and must match an account on the device<br>along with `name`, or the OS will delete the calendar.<br>On iOS, one of [`SourceType`](#sourcetype)s. |

### Enums

#### AlarmMethod (*Enum*)
Available on platform: android
#### Members
- `ALARM`
- `ALERT`
- `DEFAULT`
- `EMAIL`
- `SMS`

#### AttendeeRole (*Enum*)
#### Members
- `ATTENDEE`
- `CHAIR`
- `NON_PARTICIPANT`
- `NONE`
- `OPTIONAL`
- `ORGANIZER`
- `PERFORMER`
- `REQUIRED`
- `SPEAKER`
- `UNKNOWN`

#### AttendeeStatus (*Enum*)
#### Members
- `ACCEPTED`
- `COMPLETED`
- `DECLINED`
- `DELEGATED`
- `IN_PROCESS`
- `INVITED`
- `NONE`
- `PENDING`
- `TENTATIVE`
- `UNKNOWN`

#### AttendeeType (*Enum*)
#### Members
- `GROUP`
- `NONE`
- `OPTIONAL`
- `PERSON`
- `REQUIRED`
- `RESOURCE`
- `ROOM`
- `UNKNOWN`

#### Availability (*Enum*)
#### Members
- `BUSY`
- `FREE`
- `NOT_SUPPORTED`
- `TENTATIVE`
- `UNAVAILABLE`

#### CalendarAccessLevel (*Enum*)
Available on platform: android
#### Members
- `CONTRIBUTOR`
- `EDITOR`
- `FREEBUSY`
- `NONE`
- `OVERRIDE`
- `OWNER`
- `READ`
- `RESPOND`
- `ROOT`

#### CalendarDialogResultActions (*Enum*)
Enum containing all possible user responses to the calendar UI dialogs. Depending on what dialog is presented, a subset of the values applies.
#### Members
- `canceled` — The user canceled or dismissed the dialog.
- `deleted` — The user deleted the event.
- `done` — On Android, this is the only possible result because the OS doesn't provide enough information to determine the user's action -
the user may have canceled the dialog, modified the event, or deleted it.

On iOS, this means the user simply closed the dialog.
- `responded` — The user responded to and saved a pending event invitation.
- `saved` — The user saved a new event or modified an existing one.

#### CalendarType (*Enum*)
Available on platform: ios
#### Members
- `BIRTHDAYS`
- `CALDAV`
- `EXCHANGE`
- `LOCAL`
- `SUBSCRIBED`
- `UNKNOWN`

#### DayOfTheWeek (*Enum*)
Available on platform: ios
#### Members
- `Friday`
- `Monday`
- `Saturday`
- `Sunday`
- `Thursday`
- `Tuesday`
- `Wednesday`

#### EntityTypes (*Enum*)
platform ios
#### Members
- `EVENT`
- `REMINDER`

#### EventAccessLevel (*Enum*)
Available on platform: android
#### Members
- `CONFIDENTIAL`
- `DEFAULT`
- `PRIVATE`
- `PUBLIC`

#### EventStatus (*Enum*)
#### Members
- `CANCELED`
- `CONFIRMED`
- `NONE`
- `TENTATIVE`

#### Frequency (*Enum*)
#### Members
- `DAILY`
- `MONTHLY`
- `WEEKLY`
- `YEARLY`

#### MonthOfTheYear (*Enum*)
Available on platform: ios
#### Members
- `April`
- `August`
- `December`
- `February`
- `January`
- `July`
- `June`
- `March`
- `May`
- `November`
- `October`
- `September`

#### PermissionStatus (*Enum*)
#### Members
- `DENIED` — User has denied the permission.
- `GRANTED` — User has granted the permission.
- `UNDETERMINED` — User hasn't granted or denied the permission yet.

#### ReminderStatus (*Enum*)
Available on platform: ios
#### Members
- `COMPLETED`
- `INCOMPLETE`

#### SourceType (*Enum*)
Available on platform: ios
#### Members
- `BIRTHDAYS`
- `CALDAV`
- `EXCHANGE`
- `LOCAL`
- `MOBILEME`
- `SUBSCRIBED`

## Permissions

### Android

If you only intend to use the [system-provided calendar UI](#launching-system-provided-calendar-dialogs), you don't need to request any permissions.

Otherwise, you must add the following permissions to your **app.json** inside the [`expo.android.permissions`](../config/app/#permissions) array.

<AndroidPermissions permissions={['READ_CALENDAR', 'WRITE_CALENDAR']} />

### iOS

If you only intend to create events using system-provided calendar UI with [`createEventInCalendarAsync`](#createeventincalendarasynceventdata-presentationoptions), you don't need to request permissions.

The following usage description keys are used by this library:

<IOSPermissions permissions={['NSCalendarsUsageDescription', 'NSRemindersUsageDescription']} />