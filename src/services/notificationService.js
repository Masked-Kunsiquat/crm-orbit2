import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import db from '../database';
import { ServiceError } from './errors';

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
  endHour: 8,    // 8 AM
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
      throw new ServiceError('notificationService', 'getPermissionStatus', error);
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
      throw new ServiceError('notificationService', 'requestPermissions', error);
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
      const reminderTime = new Date(reminder.reminder_datetime);
      const now = new Date();

      // Don't schedule past reminders
      if (reminderTime <= now) {
        console.warn(`Reminder time ${reminderTime.toISOString()} is in the past, skipping`);
        return null;
      }

      // Check quiet hours
      if (await this.isInQuietHours(reminderTime)) {
        reminderTime.setHours(await this.getQuietHoursEnd());
        reminderTime.setMinutes(0);
        reminderTime.setSeconds(0);
      }

      const content = {
        title: event.title || 'Event Reminder',
        body: this.formatReminderMessage(event, reminder),
        data: {
          eventId: event.id,
          reminderId: reminder.id,
          type: 'event_reminder',
        },
      };

      const trigger = {
        date: reminderTime,
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
      const reminders = await db.eventsReminders.getUnsentRemindersByEvent(eventId);

      const scheduledIds = [];

      for (const reminder of reminders) {
        const notificationId = await this.scheduleReminder(reminder, event);
        if (notificationId) {
          scheduledIds.push(notificationId);
        }
      }

      return scheduledIds;
    } catch (error) {
      throw new ServiceError('notificationService', 'scheduleEventReminders', error);
    }
  },

  /**
   * Schedule reminders for recurring events (like birthdays)
   * @param {object} event - Event data
   * @param {number} yearsAhead - How many years to schedule ahead (default: 2)
   * @returns {Promise<string[]>} Array of scheduled notification IDs
   */
  async scheduleRecurringReminders(event, yearsAhead = 2) {
    try {
      if (!event.recurring) {
        return [];
      }

      const scheduledIds = [];
      const baseDate = new Date(event.event_date);
      const now = new Date();

      // Get default reminder settings from user preferences
      const reminderLeadTime = await this.getReminderLeadTime();

      for (let year = 0; year <= yearsAhead; year++) {
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

        const content = {
          title: event.title || 'Recurring Event Reminder',
          body: this.formatRecurringReminderMessage(event, eventDate),
          data: {
            eventId: event.id,
            type: 'recurring_reminder',
            eventDate: eventDate.toISOString(),
          },
        };

        const trigger = {
          date: reminderTime,
          channelId: Platform.OS === 'android' ? 'event-reminders' : undefined,
        };

        const notificationId = await Notifications.scheduleNotificationAsync({
          content,
          trigger,
        });

        scheduledIds.push(notificationId);
      }

      return scheduledIds;
    } catch (error) {
      throw new ServiceError('notificationService', 'scheduleRecurringReminders', error);
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
      throw new ServiceError('notificationService', 'cancelNotification', error);
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
      throw new ServiceError('notificationService', 'cancelEventNotifications', error);
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
      throw new ServiceError('notificationService', 'cancelAllNotifications', error);
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
      throw new ServiceError('notificationService', 'getScheduledNotifications', error);
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
      throw new ServiceError('notificationService', 'cleanupNotifications', error);
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
      const enabled = await db.settings.getValue('notifications', 'quiet_hours_enabled', 'boolean') ?? DEFAULT_QUIET_HOURS.enabled;
      const startHour = await db.settings.getValue('notifications', 'quiet_hours_start', 'number') ?? DEFAULT_QUIET_HOURS.startHour;
      const endHour = await db.settings.getValue('notifications', 'quiet_hours_end', 'number') ?? DEFAULT_QUIET_HOURS.endHour;

      return { enabled, startHour, endHour };
    } catch (error) {
      throw new ServiceError('notificationService', 'getQuietHoursSettings', error);
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
      return await db.settings.getValue('notifications', 'reminder_lead_time_minutes', 'number') ?? 30;
    } catch (error) {
      throw new ServiceError('notificationService', 'getReminderLeadTime', error);
    }
  },

  /**
   * Format reminder message for notifications
   * @param {object} event - Event data
   * @param {object} reminder - Reminder data
   * @returns {string} Formatted message
   */
  formatReminderMessage(event, reminder) {
    const eventDate = new Date(event.event_date);
    const reminderTime = new Date(reminder.reminder_datetime);
    const eventTime = eventDate.toLocaleString();

    let message = '';

    if (event.event_type === 'birthday') {
      message = `Birthday reminder: ${event.title} - ${eventTime}`;
    } else {
      message = `Event reminder: ${event.title} - ${eventTime}`;
    }

    if (event.notes) {
      message += `\n${event.notes}`;
    }

    return message;
  },

  /**
   * Format recurring reminder message
   * @param {object} event - Event data
   * @param {Date} eventDate - Specific occurrence date
   * @returns {string} Formatted message
   */
  formatRecurringReminderMessage(event, eventDate) {
    const eventTime = eventDate.toLocaleString();

    let message = '';

    if (event.event_type === 'birthday') {
      const age = eventDate.getFullYear() - new Date(event.event_date).getFullYear();
      message = `Birthday reminder: ${event.title} (${age} years old) - ${eventTime}`;
    } else {
      message = `Recurring event: ${event.title} - ${eventTime}`;
    }

    return message;
  },

  /**
   * Sync all pending reminders with the notification system
   * @returns {Promise<{scheduled: number, cancelled: number}>}
   */
  async syncAllReminders() {
    try {
      // First, clean up any expired notifications
      await this.cleanupNotifications();

      // Get all pending reminders from the database
      const pendingReminders = await db.eventsReminders.getUnsentReminders();

      let scheduled = 0;

      for (const reminder of pendingReminders) {
        // Get the associated event
        const event = await db.events.getById(reminder.event_id);
        if (event) {
          const notificationId = await this.scheduleReminder(reminder, event);
          if (notificationId) {
            scheduled++;
          }
        }
      }

      // Schedule recurring events
      const recurringEvents = await db.events.getRecurringEvents();
      for (const event of recurringEvents) {
        const recurringIds = await this.scheduleRecurringReminders(event);
        scheduled += recurringIds.length;
      }

      return { scheduled, cancelled: 0 };
    } catch (error) {
      throw new ServiceError('notificationService', 'syncAllReminders', error);
    }
  },
};