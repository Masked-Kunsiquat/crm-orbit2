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
      const originalReminderTime = new Date(reminder.reminder_datetime);
      const now = new Date();

      // Don't schedule past reminders
      if (originalReminderTime <= now) {
        console.warn(`Reminder time ${originalReminderTime.toISOString()} is in the past, skipping`);
        return null;
      }

      // Create a copy for scheduling (do not mutate the original)
      let scheduledTime = new Date(originalReminderTime);

      // Check quiet hours and adjust if necessary
      if (await this.isInQuietHours(originalReminderTime)) {
        // Create adjusted time for quiet hours
        scheduledTime = new Date(originalReminderTime);
        scheduledTime.setHours(await this.getQuietHoursEnd());
        scheduledTime.setMinutes(0);
        scheduledTime.setSeconds(0);

        // Persist the adjusted time back to the database
        await db.eventsReminders.updateReminderDateTime(
          reminder.id,
          scheduledTime.toISOString()
        );

        console.log(`Reminder ${reminder.id} adjusted for quiet hours from ${originalReminderTime.toISOString()} to ${scheduledTime.toISOString()}`);
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
      const birthDate = new Date(event.event_date);
      const currentYear = eventDate.getFullYear();

      // Calculate age properly by checking if birthday has occurred this year
      let age = currentYear - birthDate.getFullYear();

      // Check if birthday hasn't occurred yet this year
      const birthdayThisYear = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
      if (eventDate < birthdayThisYear) {
        age -= 1;
      }

      message = `Birthday reminder: ${event.title} (${age} years old) - ${eventTime}`;
    } else {
      message = `Recurring event: ${event.title} - ${eventTime}`;
    }

    return message;
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
      await db.transaction(async (tx) => {
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

        // Get pending reminders that need scheduling
        const reminderRes = await tx.execute(
          `SELECT r.*, e.title, e.event_date, e.contact_id
           FROM event_reminders r
           JOIN events e ON r.event_id = e.id
           WHERE r.is_sent = 0 AND r.notification_id IS NULL
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
          const baseDate = new Date(event.event_date);

          // Create reminders for next 2 years
          for (let year = 0; year <= 2; year++) {
            const eventDate = new Date(baseDate);
            eventDate.setFullYear(now.getFullYear() + year);

            if (eventDate <= now && year === 0) continue;

            const reminderTime = new Date(eventDate);
            reminderTime.setMinutes(reminderTime.getMinutes() - reminderLeadTime);

            if (reminderTime <= now) continue;

            // Check if this reminder already exists
            const existingRes = await tx.execute(
              'SELECT id FROM event_reminders WHERE event_id = ? AND reminder_datetime = ?;',
              [event.id, reminderTime.toISOString()]
            );

            if (existingRes.rows.length === 0) {
              // Create new recurring reminder
              const reminderRes = await tx.execute(
                `INSERT INTO event_reminders (event_id, reminder_datetime, reminder_type, is_sent, created_at)
                 VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP);`,
                [event.id, reminderTime.toISOString(), 'notification']
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
                  contact_id: event.contact_id
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
              console.warn(`Failed to cancel expired notification ${notification.identifier}:`, error.message);
            }
          }
        }
      }

      // Schedule pending reminders
      for (const reminder of pendingReminders) {
        try {
          const notificationId = await this.scheduleReminder(reminder, reminder);
          if (notificationId) {
            scheduledItems.push({ reminderId: reminder.id, notificationId });
          } else {
            failedItems.push(reminder.id);
          }
        } catch (error) {
          console.warn(`Failed to schedule reminder ${reminder.id}:`, error.message);
          failedItems.push(reminder.id);
        }
      }

      // Schedule new recurring reminders
      for (const reminder of newRecurringReminders) {
        try {
          const notificationId = await this.scheduleReminder(reminder, reminder);
          if (notificationId) {
            scheduledItems.push({ reminderId: reminder.id, notificationId });
          } else {
            failedItems.push(reminder.id);
          }
        } catch (error) {
          console.warn(`Failed to schedule recurring reminder ${reminder.id}:`, error.message);
          failedItems.push(reminder.id);
        }
      }

      // Phase 3: Update database with scheduling results in new transaction
      await db.transaction(async (tx) => {
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

      console.log(`Sync completed: ${scheduledItems.length} scheduled, ${failedItems.length} failed, ${cleanupResult.cancelledCount} cancelled`);

      return {
        scheduled: scheduledItems.length,
        failed: failedItems.length,
        cancelled: cleanupResult.cancelledCount
      };

    } catch (error) {
      console.error('Sync failed, attempting cleanup...', error);

      // Attempt to rollback any partial external scheduling
      if (scheduledItems.length > 0) {
        console.log(`Rolling back ${scheduledItems.length} scheduled notifications...`);
        for (const { notificationId } of scheduledItems) {
          try {
            await this.cancelNotification(notificationId);
          } catch (rollbackError) {
            console.warn(`Failed to rollback notification ${notificationId}:`, rollbackError.message);
          }
        }
      }

      throw new ServiceError('notificationService', 'syncAllReminders', error);
    }
  },
};