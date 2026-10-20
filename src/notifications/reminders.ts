import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { CalendarEvent } from '../types';

export const MESSAGE_CHANNEL_ID = 'messages';
export const EVENT_CHANNEL_ID = 'events';

export async function configureNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(MESSAGE_CHANNEL_ID, {
    name: 'Messages',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#0F766E',
    // Privacy default: the partner's message text is never shown.
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync(EVENT_CHANNEL_ID, {
    name: 'Calendar reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#0F766E',
    sound: 'default',
  });
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/** Stable notification id so re-scheduling replaces rather than duplicates. */
export function reminderIdentifier(eventId: string, minutes: number): string {
  return `event:${eventId}:${minutes}`;
}

/**
 * Fire time for a reminder.
 * All-day events count from 09:00 local on their start date.
 */
export function reminderFireDate(event: CalendarEvent, minutesBefore: number): Date | null {
  if (event.allDay && event.startsOn) {
    const [year, month, day] = event.startsOn.split('-').map(Number);
    if (!year || !month || !day) return null;
    const base = new Date(year, month - 1, day, 9, 0, 0, 0);
    return new Date(base.getTime() - minutesBefore * 60_000);
  }

  if (event.startsAt) {
    const start = new Date(event.startsAt);
    if (Number.isNaN(start.getTime())) return null;
    return new Date(start.getTime() - minutesBefore * 60_000);
  }

  return null;
}

export async function cancelEventReminders(eventId: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const prefix = `event:${eventId}:`;

  await Promise.all(
    scheduled
      .filter((item) => item.identifier.startsWith(prefix))
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
}

export async function scheduleEventReminders(event: CalendarEvent): Promise<void> {
  await cancelEventReminders(event.id);

  if (event.deletedAt) return;
  if (!event.reminderMinutes.length) return;

  const granted = await ensureNotificationPermission();
  if (!granted) return;

  const now = Date.now();

  for (const minutes of event.reminderMinutes) {
    const fireDate = reminderFireDate(event, minutes);
    if (!fireDate) continue;
    if (fireDate.getTime() <= now) continue;

    await Notifications.scheduleNotificationAsync({
      identifier: reminderIdentifier(event.id, minutes),
      content: {
        title: event.title,
        body:
          minutes >= 1440
            ? 'Tomorrow'
            : minutes >= 60
              ? `In ${Math.round(minutes / 60)} hour(s)`
              : `In ${minutes} minutes`,
        data: { type: 'event', eventId: event.id },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireDate,
        channelId: EVENT_CHANNEL_ID,
      },
    });
  }
}

export async function rescheduleAllReminders(events: readonly CalendarEvent[]): Promise<void> {
  for (const event of events) {
    await scheduleEventReminders(event);
  }
}
