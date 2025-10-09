import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import db from '../database';
import { ServiceError } from './errors';

// Local helper to format Date to SQLite datetime (YYYY-MM-DD HH:MM:SS)
function formatSQLiteDateTime(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

/**
 * Parse a SQLite-style datetime string (e.g., 'YYYY-MM-DD HH:MM:SS') into a JS Date.
 * - Accepts 'YYYY-MM-DD' (interpreted as 00:00:00 local time)
 * - Accepts 'YYYY-MM-DD HH:MM' or 'YYYY-MM-DD HH:MM:SS'
 * - Returns null on invalid input
 *
 * @param {string|number|Date|null|undefined} input
 * @returns {Date|null}
 */
function parseSqliteDatetime(input) {
  try {
    if (input == null) return null;
    if (input instanceof Date) {
      const t = input.getTime();
      return Number.isNaN(t) ? null : new Date(t);
    }
    if (typeof input === 'number') {
      const d = new Date(input);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (typeof input !== 'string') return null;

    const trimmed = input.trim();
    if (!trimmed) return null;

    // Normalize: replace T with space, drop trailing Z, drop fractional seconds
    const normalized = trimmed.replace('T', ' ').replace(/Z$/i, '');
    const [datePartRaw, timePartRaw] = normalized.split(' ');
    const datePart = datePartRaw;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;
    const [yStr, mStr, dStr] = datePart.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);
    const day = parseInt(dStr, 10);
    if (!(year >= 0 && month >= 1 && month <= 12 && day >= 1 && day <= 31))
      return null;

    let hour = 0,
      minute = 0,
      second = 0;
    if (timePartRaw && timePartRaw.length) {
      const timePart = timePartRaw.split('.')[0]; // drop fractional seconds if any
      const pieces = timePart.split(':');
      if (pieces.length < 2) return null; // need at least HH:MM
      hour = parseInt(pieces[0], 10);
      minute = parseInt(pieces[1], 10);
      second = pieces.length >= 3 ? parseInt(pieces[2], 10) : 0;
      if (
        Number.isNaN(hour) ||
        hour < 0 ||
        hour > 23 ||
        Number.isNaN(minute) ||
        minute < 0 ||
        minute > 59 ||
        Number.isNaN(second) ||
        second < 0 ||
        second > 59
      ) {
        return null;
      }
    }

    const d = new Date(year, month - 1, day, hour, minute, second);
    if (Number.isNaN(d.getTime())) return null;
    // Validate no rollover occurred (e.g., 2023-02-31)
    if (
      d.getFullYear() !== year ||
      d.getMonth() !== month - 1 ||
      d.getDate() !== day ||
      d.getHours() !== hour ||
      d.getMinutes() !== minute ||
      d.getSeconds() !== second
    ) {
      return null;
    }
    return d;
  } catch {
    return null;
  }
}

/**
 * Configure notification behavior
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Quiet hours configuration
 */
const DEFAULT_QUIET_HOURS = {
  enabled: false,
  startHour: 22, // 10 PM
  endHour: 8, // 8 AM
};

/**
 * Notification templates for standardized content across different event types
 */
const NOTIFICATION_TEMPLATES = {
  birthday: {
    title: 'Birthday Reminder',
    body: (event, context) => {
      const { eventTime, age } = context;
      if (age !== undefined) {
        return `Birthday reminder: ${event.title} (${age} years old) - ${eventTime}`;
      }
      return `Birthday reminder: ${event.title} - ${eventTime}`;
    },
    data: (event, context) => ({
      eventId: event.id,
      type: context.isRecurring ? 'recurring_birthday' : 'birthday_reminder',
      eventType: 'birthday',
      contactId: event.contact_id,
      ...(context.isRecurring && {
        eventDate: context.eventDate?.toISOString(),
      }),
      ...(context.reminderId && { reminderId: context.reminderId }),
    }),
  },
  meeting: {
    title: 'Meeting Reminder',
    body: (event, context) => {
      const { eventTime } = context;
      let message = `Meeting reminder: ${event.title} - ${eventTime}`;
      if (event.location) {
        message += `\nLocation: ${event.location}`;
      }
      if (event.notes) {
        message += `\n${event.notes}`;
      }
      return message;
    },
    data: (event, context) => ({
      eventId: event.id,
      type: context.isRecurring ? 'recurring_meeting' : 'meeting_reminder',
      eventType: 'meeting',
      ...(event.location && { location: event.location }),
      ...(context.isRecurring && {
        eventDate: context.eventDate?.toISOString(),
      }),
      ...(context.reminderId && { reminderId: context.reminderId }),
    }),
  },
  followUp: {
    title: 'Follow-up Reminder',
    body: (event, context) => {
      const { eventTime } = context;
      let message = `Follow-up reminder: ${event.title} - ${eventTime}`;
      if (event.contact_name) {
        message = `Follow-up reminder: ${event.contact_name} - ${event.title} - ${eventTime}`;
      }
      if (event.notes) {
        message += `\n${event.notes}`;
      }
      return message;
    },
    data: (event, context) => ({
      eventId: event.id,
      type: context.isRecurring ? 'recurring_followup' : 'followup_reminder',
      eventType: 'followUp',
      contactId: event.contact_id,
      ...(context.isRecurring && {
        eventDate: context.eventDate?.toISOString(),
      }),
      ...(context.reminderId && { reminderId: context.reminderId }),
    }),
  },
  // Generic template for other event types
  generic: {
    title: 'Event Reminder',
    body: (event, context) => {
      const { eventTime } = context;
      let message = `Event reminder: ${event.title} - ${eventTime}`;
      if (event.notes) {
        message += `\n${event.notes}`;
      }
      return message;
    },
    data: (event, context) => ({
      eventId: event.id,
      type: context.isRecurring ? 'recurring_event' : 'event_reminder',
      eventType: event.event_type || 'generic',
      ...(context.isRecurring && {
        eventDate: context.eventDate?.toISOString(),
      }),
      ...(context.reminderId && { reminderId: context.reminderId }),
    }),
  },
};

/**
 * Notification service for managing event reminders using Expo Notifications.
 * Handles permissions, scheduling, recurring events, and quiet hours.
 */
export const notificationService = {
  /**
   * Initialize notification service and request permissions
   * @returns {Promise<boolean>} Whether permissions were granted
   */
  async initialize() {
    try {
      if (!Device.isDevice) {
        console.warn('Notifications require a physical device');
        return false;
      }

      let finalStatus = await this.getPermissionStatus();

      if (finalStatus !== 'granted') {
        finalStatus = await this.requestPermissions();
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permissions not granted');
        return false;
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('event-reminders', {
          name: 'Event Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return true;
    } catch (error) {
      throw new ServiceError('notificationService', 'initialize', error);
    }
  },

  /**
   * Get current notification permission status
   * @returns {Promise<string>} Permission status
   */
  async getPermissionStatus() {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch (error) {
      throw new ServiceError(
        'notificationService',
        'getPermissionStatus',
        error
      );
    }
  },

  /**
   * Request notification permissions from the user
   * @returns {Promise<string>} Permission status after request
   */
  async requestPermissions() {
    try {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: false,
        },
      });
      return status;
    } catch (error) {
      throw new ServiceError(
        'notificationService',
        'requestPermissions',
        error
      );
    }
  },

  /**
   * Schedule a notification for an event reminder
   * @param {object} reminder - Reminder data from database
   * @param {object} event - Event data from database
   * @returns {Promise<string|null>} Notification identifier or null if not scheduled
   */
  async scheduleReminder(reminder, event) {
    try {
      const originalReminderTime = parseSqliteDatetime(
        reminder.reminder_datetime
      );
      if (!originalReminderTime) {
        console.warn(
          'Invalid reminder_datetime; skipping schedule:',
          reminder.reminder_datetime,
          '(reminder id:',
          reminder?.id,
          ')'
        );
        return null;
      }
      const now = new Date();

      // Create a copy for scheduling (do not mutate the original)
      let scheduledTime = new Date(originalReminderTime);
      let timeWasAdjusted = false;

      // Check quiet hours and adjust if necessary
      if (await this.isInQuietHours(originalReminderTime)) {
        // Create adjusted time for quiet hours
        scheduledTime = new Date(originalReminderTime);
        const endHour = await this.getQuietHoursEnd();
        scheduledTime.setUTCHours(endHour);
        scheduledTime.setUTCMinutes(0);
        scheduledTime.setUTCSeconds(0);

        // Ensure adjusted time is in the future for overnight quiet hours
        // If the adjusted time is in the past, move it to the next day
        if (scheduledTime <= now) {
          scheduledTime.setDate(scheduledTime.getDate() + 1);
        }

        // Persist the adjusted time back to the database
        await db.eventsReminders.updateReminderDateTime(
          reminder.id,
          scheduledTime.toISOString()
        );

        timeWasAdjusted = true;
        console.log(
          `Reminder ${reminder.id} adjusted for quiet hours from ${originalReminderTime.toISOString()} to ${scheduledTime.toISOString()}`
        );
      }

      // Don't schedule past reminders (check after quiet hours adjustment)
      if (scheduledTime <= now) {
        console.warn(
          `Reminder time ${scheduledTime.toISOString()} is in the past, skipping`
        );
        return null;
      }

      // Use template system for notification content
      const eventDate = parseSqliteDatetime(event.event_date);
      if (!eventDate) {
        console.warn(
          'Invalid event_date for event; proceeding with raw value:',
          event?.id,
          event?.event_date
        );
      }
      const context = {
        eventTime: eventDate
          ? eventDate.toLocaleString()
          : String(event?.event_date ?? 'Unknown date'),
        isRecurring: false,
        reminderId: reminder.id,
      };

      const { title, body, data } = this.renderNotificationTemplate(
        event,
        context
      );
      const content = { title, body, data };

      const trigger = {
        date: scheduledTime,
        channelId: Platform.OS === 'android' ? 'event-reminders' : undefined,
      };

      const notificationId = await Notifications.scheduleNotificationAsync({
        content,
        trigger,
      });

      return notificationId;
    } catch (error) {
      throw new ServiceError('notificationService', 'scheduleReminder', error);
    }
  },

  /**
   * Schedule all pending reminders for an event
   * @param {number} eventId - Event ID
   * @returns {Promise<string[]>} Array of scheduled notification IDs
   */
  async scheduleEventReminders(eventId) {
    try {
      // Get event details
      const event = await db.events.getById(eventId);
      if (!event) {
        throw new Error(`Event with ID ${eventId} not found`);
      }

      // Get all unsent reminders for this event
      const reminders =
        await db.eventsReminders.getUnsentRemindersByEvent(eventId);

      const scheduledIds = [];

      for (const reminder of reminders) {
        const notificationId = await this.scheduleReminder(reminder, event);
        if (!notificationId) {
          continue;
        }
        try {
          // Persist the notification ID for this reminder
          const affected = await db.eventsReminders.markRemindersScheduled([
            { reminderId: reminder.id, notificationId },
          ]);
          // Only record IDs that were actually persisted
          if (typeof affected === 'number' ? affected > 0 : true) {
            scheduledIds.push(notificationId);
          } else {
            console.warn(
              `Failed to persist notification_id for reminder ${reminder.id}; excluding from results`
            );
          }
        } catch (persistError) {
          console.warn(
            `Error persisting notification_id for reminder ${reminder.id}:`,
            persistError?.message || persistError
          );
          // Do not include in returned list since persistence failed
        }
      }

      return scheduledIds;
    } catch (error) {
      throw new ServiceError(
        'notificationService',
        'scheduleEventReminders',
        error
      );
    }
  },

  /**
   * Schedule reminders for recurring events (like birthdays)
   * @param {object} event - Event data
   * @param {number} yearsAhead - How many years to schedule ahead (default: 2)
   * @returns {Promise<Array<{reminderId: number, notificationId: string}>>} Array of reminder and notification ID pairs
   */
  async scheduleRecurringReminders(event, yearsAhead = 2) {
    try {
      if (!event.recurring) {
        return [];
      }

      const scheduledItems = [];
      const createdReminderIds = [];
      const scheduledNotificationIds = [];
      const baseDate = parseSqliteDatetime(event.event_date);
      if (!baseDate) {
        console.warn(
          'Invalid event_date for recurring schedule; skipping:',
          event?.id,
          event?.event_date
        );
        return [];
      }
      const now = new Date();

      // Get default reminder settings from user preferences
      const reminderLeadTime = await this.getReminderLeadTime();

      // Step 1: Build reminder objects for database persistence
      const reminderData = [];

      for (let year = 0; year < yearsAhead; year++) {
        const eventDate = new Date(baseDate);
        eventDate.setFullYear(now.getFullYear() + year);

        // Skip if this year's occurrence has already passed
        if (eventDate <= now && year === 0) {
          continue;
        }

        // Calculate reminder time
        const reminderTime = new Date(eventDate);
        reminderTime.setMinutes(reminderTime.getMinutes() - reminderLeadTime);

        // Don't schedule if reminder time is in the past
        if (reminderTime <= now) {
          continue;
        }

        // Build reminder object for database
        reminderData.push({
          event_id: event.id,
          reminder_datetime: reminderTime.toISOString(),
          reminder_type: 'notification',
          is_sent: false,
        });
      }

      if (reminderData.length === 0) {
        return [];
      }

      // Step 2: Persist reminder records to database first
      const createdReminders =
        await db.eventsReminders.createRecurringReminders(reminderData);
      createdReminderIds.push(...createdReminders.map(r => r.id));

      // Step 3: Schedule notifications for each persisted reminder
      const failedItems = [];

      for (let i = 0; i < createdReminders.length; i++) {
        const reminder = createdReminders[i];

        try {
          // Use the standardized scheduleReminder method for consistency
          // This ensures quiet hours, past-time checking, and other features are applied
          const notificationId = await this.scheduleReminder(reminder, event);

          if (notificationId) {
            scheduledNotificationIds.push(notificationId);
            scheduledItems.push({
              reminderId: reminder.id,
              notificationId: notificationId,
            });
          } else {
            // scheduleReminder returns null for skipped reminders (e.g., past due)
            failedItems.push(reminder.id);
          }
        } catch (schedulingError) {
          console.warn(
            `Failed to schedule notification for reminder ${reminder.id}:`,
            schedulingError.message
          );
          failedItems.push(reminder.id);

          // Rollback: Cancel any successfully scheduled notifications
          for (const notificationId of scheduledNotificationIds) {
            try {
              await this.cancelNotification(notificationId);
            } catch (cancelError) {
              console.warn(
                `Failed to cancel notification ${notificationId} during rollback:`,
                cancelError.message
              );
            }
          }

          // Delete created reminder records
          for (const reminderId of createdReminderIds) {
            try {
              await db.eventsReminders.deleteReminder(reminderId);
            } catch (deleteError) {
              console.warn(
                `Failed to delete reminder ${reminderId} during rollback:`,
                deleteError.message
              );
            }
          }

          throw schedulingError;
        }
      }

      // Step 4: Update all reminder records with notification IDs in batch
      if (scheduledItems.length > 0) {
        await db.transaction(async tx => {
          return await db.eventsReminders.markRemindersScheduled(
            scheduledItems
          );
        });
      }

      return scheduledItems;
    } catch (error) {
      throw new ServiceError(
        'notificationService',
        'scheduleRecurringReminders',
        error
      );
    }
  },

  /**
   * Cancel a scheduled notification
   * @param {string} notificationId - Notification identifier
   * @returns {Promise<void>}
   */
  async cancelNotification(notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      throw new ServiceError(
        'notificationService',
        'cancelNotification',
        error
      );
    }
  },

  /**
   * Cancel all scheduled notifications for an event
   * @param {number} eventId - Event ID
   * @returns {Promise<void>}
   */
  async cancelEventNotifications(eventId) {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();

      const eventNotifications = scheduled.filter(
        notification => notification.content.data?.eventId === eventId
      );

      for (const notification of eventNotifications) {
        await this.cancelNotification(notification.identifier);
      }
    } catch (error) {
      throw new ServiceError(
        'notificationService',
        'cancelEventNotifications',
        error
      );
    }
  },

  /**
   * Cancel all scheduled notifications
   * @returns {Promise<void>}
   */
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      throw new ServiceError(
        'notificationService',
        'cancelAllNotifications',
        error
      );
    }
  },

  /**
   * Get all scheduled notifications
   * @returns {Promise<Array>} Array of scheduled notifications
   */
  async getScheduledNotifications() {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      throw new ServiceError(
        'notificationService',
        'getScheduledNotifications',
        error
      );
    }
  },

  /**
   * Clean up expired notifications and mark sent reminders
   * @returns {Promise<{cancelledCount: number, markedSentCount: number}>}
   */
  async cleanupNotifications() {
    try {
      const now = new Date();
      let cancelledCount = 0;
      let markedSentCount = 0;

      // Get all scheduled notifications
      const scheduled = await this.getScheduledNotifications();

      // Cancel expired notifications
      for (const notification of scheduled) {
        const triggerDate = new Date(notification.trigger.date);
        if (triggerDate <= now) {
          await this.cancelNotification(notification.identifier);
          cancelledCount++;

          // Mark reminder as sent if it has a reminder ID
          const reminderId = notification.content.data?.reminderId;
          if (reminderId) {
            await db.eventsReminders.markReminderSent(reminderId);
            markedSentCount++;
          }
        }
      }

      return { cancelledCount, markedSentCount };
    } catch (error) {
      throw new ServiceError(
        'notificationService',
        'cleanupNotifications',
        error
      );
    }
  },

  /**
   * Check if a given time falls within quiet hours
   * @param {Date} time - Time to check
   * @returns {Promise<boolean>}
   */
  async isInQuietHours(time) {
    try {
      const quietHours = await this.getQuietHoursSettings();

      if (!quietHours.enabled) {
        return false;
      }

      const hour = time.getHours();
      const { startHour, endHour } = quietHours;

      // Handle overnight quiet hours (e.g., 10 PM to 8 AM)
      if (startHour > endHour) {
        return hour >= startHour || hour < endHour;
      }

      // Handle same-day quiet hours (e.g., 1 PM to 5 PM)
      return hour >= startHour && hour < endHour;
    } catch (error) {
      throw new ServiceError('notificationService', 'isInQuietHours', error);
    }
  },

  /**
   * Get quiet hours settings from user preferences
   * @returns {Promise<object>} Quiet hours configuration
   */
  async getQuietHoursSettings() {
    try {
      const settings = await db.settings.getValues('notifications', [
        { key: 'quiet_hours_enabled', expectedType: 'boolean' },
        { key: 'quiet_hours_start', expectedType: 'number' },
        { key: 'quiet_hours_end', expectedType: 'number' },
      ]);

      return {
        enabled: settings.quiet_hours_enabled ?? DEFAULT_QUIET_HOURS.enabled,
        startHour: settings.quiet_hours_start ?? DEFAULT_QUIET_HOURS.startHour,
        endHour: settings.quiet_hours_end ?? DEFAULT_QUIET_HOURS.endHour,
      };
    } catch (error) {
      throw new ServiceError(
        'notificationService',
        'getQuietHoursSettings',
        error
      );
    }
  },

  /**
   * Get the end hour of quiet hours
   * @returns {Promise<number>}
   */
  async getQuietHoursEnd() {
    try {
      const quietHours = await this.getQuietHoursSettings();
      return quietHours.endHour;
    } catch (error) {
      throw new ServiceError('notificationService', 'getQuietHoursEnd', error);
    }
  },

  /**
   * Get reminder lead time in minutes from user preferences
   * @returns {Promise<number>} Lead time in minutes
   */
  async getReminderLeadTime() {
    try {
      return (
        (await db.settings.getValue(
          'notifications',
          'reminder_lead_time_minutes',
          'number'
        )) ?? 30
      );
    } catch (error) {
      throw new ServiceError(
        'notificationService',
        'getReminderLeadTime',
        error
      );
    }
  },

  /**
   * Render a notification using the appropriate template
   * @param {object} event - Event data
   * @param {object} context - Context data for template rendering
   * @returns {object} Rendered notification content {title, body, data}
   */
  renderNotificationTemplate(event, context) {
    try {
      // Determine template based on event type
      const templateKey = this.getTemplateKey(event.event_type);
      const template = NOTIFICATION_TEMPLATES[templateKey];

      if (!template) {
        throw new Error(
          `No template found for event type: ${event.event_type}`
        );
      }

      // Render the template
      const title =
        typeof template.title === 'function'
          ? template.title(event, context)
          : template.title;

      const body = template.body(event, context);
      const data = template.data(event, context);

      return { title, body, data };
    } catch (error) {
      // Fallback to generic template on error
      const genericTemplate = NOTIFICATION_TEMPLATES.generic;
      return {
        title: genericTemplate.title,
        body: genericTemplate.body(event, context),
        data: genericTemplate.data(event, context),
      };
    }
  },

  /**
   * Get the appropriate template key for an event type
   * @param {string} eventType - Event type
   * @returns {string} Template key
   */
  getTemplateKey(eventType) {
    const normalizedType = eventType?.toLowerCase();

    // Map event types to template keys
    const typeMapping = {
      birthday: 'birthday',
      meeting: 'meeting',
      followup: 'followUp',
      'follow-up': 'followUp',
      follow_up: 'followUp',
    };

    return typeMapping[normalizedType] || 'generic';
  },

  /**
   * Format reminder message for notifications (legacy compatibility)
   * @param {object} event - Event data
   * @param {object} reminder - Reminder data
   * @returns {string} Formatted message
   */
  formatReminderMessage(event, reminder) {
    const eventDate = parseSqliteDatetime(event.event_date);
    if (!eventDate) {
      console.warn(
        'Invalid event_date in formatReminderMessage; using raw value:',
        event?.id,
        event?.event_date
      );
    }
    const eventTime = eventDate
      ? eventDate.toLocaleString()
      : String(event?.event_date ?? 'Unknown date');

    const context = {
      eventTime,
      isRecurring: false,
      reminderId: reminder.id,
    };

    const { body } = this.renderNotificationTemplate(event, context);
    return body;
  },

  /**
   * Format recurring reminder message (legacy compatibility)
   * @param {object} event - Event data
   * @param {Date} eventDate - Specific occurrence date
   * @returns {string} Formatted message
   */
  formatRecurringReminderMessage(event, eventDate) {
    const eventTime = eventDate.toLocaleString();

    const context = {
      eventTime,
      eventDate,
      isRecurring: true,
    };

    // Calculate age for birthday events
    if (event.event_type === 'birthday') {
      const birthDate = parseSqliteDatetime(event.event_date);
      if (!birthDate) {
        console.warn(
          'Invalid event_date for birthday; skipping age calc:',
          event?.id,
          event?.event_date
        );
      }
      const currentYear = eventDate.getFullYear();

      if (birthDate) {
        let age = currentYear - birthDate.getFullYear();
        const birthdayThisYear = new Date(
          currentYear,
          birthDate.getMonth(),
          birthDate.getDate()
        );
        if (eventDate < birthdayThisYear) {
          age -= 1;
        }
        context.age = age;
      }
    }

    const { body } = this.renderNotificationTemplate(event, context);
    return body;
  },

  /**
   * Sync all pending reminders with the notification system using atomic transactions
   * @returns {Promise<{scheduled: number, failed: number, cancelled: number}>}
   */
  async syncAllReminders() {
    let cleanupResult = { cancelledCount: 0, markedSentCount: 0 };
    let pendingReminders = [];
    let recurringEvents = [];
    let newRecurringReminders = [];
    let scheduledItems = [];
    let failedItems = [];

    try {
      // Phase 1: Atomic database operations in transaction
      await db.transaction(async tx => {
        // Clean up expired notifications (this involves external calls, so get data first)
        const scheduled = await this.getScheduledNotifications();
        const now = new Date();
        const expiredNotifications = scheduled.filter(
          notification => new Date(notification.trigger.date) <= now
        );

        // Mark expired reminders as sent in the database
        for (const notification of expiredNotifications) {
          const reminderId = notification.content.data?.reminderId;
          if (reminderId) {
            await tx.execute(
              'UPDATE event_reminders SET is_sent = 1 WHERE id = ?;',
              [reminderId]
            );
            cleanupResult.markedSentCount++;
          }
        }

        // Mark past-due unsent reminders as sent to prevent retry churn
        // Past-due reminders would be skipped by scheduleReminder but remain unscheduled,
        // causing them to be fetched repeatedly in subsequent sync operations.
        // Use UTC datetime comparison since SQLite stores datetime in UTC.
        await tx.execute(
          `UPDATE event_reminders
           SET is_sent = 1
           WHERE is_sent = 0
           AND notification_id IS NULL
           AND reminder_datetime <= datetime('now');`
        );

        // Get pending reminders that need scheduling (only future reminders)
        const reminderRes = await tx.execute(
          `SELECT r.*, e.title, e.event_date, e.contact_id
           FROM event_reminders r
           JOIN events e ON r.event_id = e.id
           WHERE r.is_sent = 0
           AND r.notification_id IS NULL
           AND r.reminder_datetime > datetime('now')
           ORDER BY r.reminder_datetime ASC;`
        );
        pendingReminders = reminderRes.rows;

        // Get recurring events that need new reminders
        const recurringRes = await tx.execute(
          'SELECT * FROM events WHERE recurring = 1;'
        );
        recurringEvents = recurringRes.rows;

        // Generate new recurring reminder records for the next period
        const reminderLeadTime = await this.getReminderLeadTime();

        for (const event of recurringEvents) {
          const baseDate = parseSqliteDatetime(event.event_date);
          if (!baseDate) {
            console.warn(
              'Invalid event_date for recurring generation; skipping event:',
              event?.id,
              event?.event_date
            );
            continue;
          }

          // Create reminders for next 2 years
          for (let year = 0; year < 2; year++) {
            const eventDate = new Date(baseDate);
            eventDate.setFullYear(now.getFullYear() + year);

            if (eventDate <= now && year === 0) continue;

            const reminderTime = new Date(eventDate);
            reminderTime.setMinutes(
              reminderTime.getMinutes() - reminderLeadTime
            );

            if (reminderTime <= now) continue;

            // Check if this reminder already exists (use SQLite datetime format)
            const sqliteReminderTime = formatSQLiteDateTime(reminderTime);
            const existingRes = await tx.execute(
              'SELECT id FROM event_reminders WHERE event_id = ? AND reminder_datetime = ?;',
              [event.id, sqliteReminderTime]
            );

            if (existingRes.rows.length === 0) {
              // Create new recurring reminder
              const reminderRes = await tx.execute(
                `INSERT INTO event_reminders (event_id, reminder_datetime, reminder_type, is_sent, created_at)
                 VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP);`,
                [event.id, sqliteReminderTime, 'notification']
              );

              if (reminderRes.insertId) {
                newRecurringReminders.push({
                  id: reminderRes.insertId,
                  event_id: event.id,
                  reminder_datetime: reminderTime.toISOString(),
                  reminder_type: 'notification',
                  is_sent: false,
                  title: event.title,
                  event_date: event.event_date,
                  contact_id: event.contact_id,
                });
              }
            }
          }
        }
      });

      // Phase 2: External scheduling operations (after successful DB transaction)
      // (scheduledItems and failedItems already declared above)

      // Cancel expired notifications from external scheduler
      if (cleanupResult.markedSentCount > 0) {
        const scheduled = await this.getScheduledNotifications();
        const now = new Date();
        for (const notification of scheduled) {
          const triggerDate = new Date(notification.trigger.date);
          if (triggerDate <= now) {
            try {
              await this.cancelNotification(notification.identifier);
              cleanupResult.cancelledCount++;
            } catch (error) {
              console.warn(
                `Failed to cancel expired notification ${notification.identifier}:`,
                error.message
              );
            }
          }
        }
      }

      // Schedule pending reminders
      for (const reminder of pendingReminders) {
        try {
          // Create event object from the joined data in reminder
          const event = {
            id: reminder.event_id,
            title: reminder.title,
            event_date: reminder.event_date,
            contact_id: reminder.contact_id,
          };
          const notificationId = await this.scheduleReminder(reminder, event);
          if (notificationId) {
            scheduledItems.push({ reminderId: reminder.id, notificationId });
          } else {
            failedItems.push(reminder.id);
          }
        } catch (error) {
          console.warn(
            `Failed to schedule reminder ${reminder.id}:`,
            error.message
          );
          failedItems.push(reminder.id);
        }
      }

      // Schedule new recurring reminders
      for (const reminder of newRecurringReminders) {
        try {
          // Create event object from the reminder data (already includes event fields)
          const event = {
            id: reminder.event_id,
            title: reminder.title,
            event_date: reminder.event_date,
            contact_id: reminder.contact_id,
          };
          const notificationId = await this.scheduleReminder(reminder, event);
          if (notificationId) {
            scheduledItems.push({ reminderId: reminder.id, notificationId });
          } else {
            failedItems.push(reminder.id);
          }
        } catch (error) {
          console.warn(
            `Failed to schedule recurring reminder ${reminder.id}:`,
            error.message
          );
          failedItems.push(reminder.id);
        }
      }

      // Phase 3: Update database with scheduling results in new transaction
      await db.transaction(async tx => {
        // Mark successfully scheduled reminders
        if (scheduledItems.length > 0) {
          for (const { reminderId, notificationId } of scheduledItems) {
            await tx.execute(
              'UPDATE event_reminders SET notification_id = ? WHERE id = ?;',
              [notificationId, reminderId]
            );
          }
        }

        // Mark failed reminders (clear notification_id so they can be retried)
        if (failedItems.length > 0) {
          for (const reminderId of failedItems) {
            await tx.execute(
              'UPDATE event_reminders SET notification_id = NULL WHERE id = ?;',
              [reminderId]
            );
          }
        }
      });

      console.log(
        `Sync completed: ${scheduledItems.length} scheduled, ${failedItems.length} failed, ${cleanupResult.cancelledCount} cancelled`
      );

      return {
        scheduled: scheduledItems.length,
        failed: failedItems.length,
        cancelled: cleanupResult.cancelledCount,
      };
    } catch (error) {
      console.error('Sync failed, attempting cleanup...', error);

      // Attempt to rollback any partial external scheduling
      if (scheduledItems.length > 0) {
        console.log(
          `Rolling back ${scheduledItems.length} scheduled notifications...`
        );
        for (const { notificationId } of scheduledItems) {
          try {
            await this.cancelNotification(notificationId);
          } catch (rollbackError) {
            console.warn(
              `Failed to rollback notification ${notificationId}:`,
              rollbackError.message
            );
          }
        }
      }

      throw new ServiceError('notificationService', 'syncAllReminders', error);
    }
  },
};
