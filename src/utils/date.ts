import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

import type { CalendarEvent } from '../types';

export const DEVICE_TIMEZONE: string =
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

/** `yyyy-MM-dd` for a local calendar date. Never timezone-shifted. */
export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** Parse a `yyyy-MM-dd` string as a local calendar date (no UTC round-trip). */
export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day) return new Date(NaN);
  return new Date(year, month - 1, day);
}

/**
 * Format an instant in a specific IANA timezone.
 * Intl is used directly so there is no dependency to drift or break.
 */
function formatInZone(
  iso: string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): string {
  try {
    return new Intl.DateTimeFormat('en-GB', { ...options, timeZone }).format(new Date(iso));
  } catch {
    return new Intl.DateTimeFormat('en-GB', options).format(new Date(iso));
  }
}

/**
 * Human label for an event.
 *
 * All-day events are formatted from their `date` columns and never pass
 * through a timezone, which is what keeps them on the right day across DST.
 */
export function formatEventRange(event: CalendarEvent, use24Hour = true): string {
  if (event.allDay) {
    const start = event.startsOn ? parseDateKey(event.startsOn) : null;
    const end = event.endsOn ? parseDateKey(event.endsOn) : null;
    if (!start || Number.isNaN(start.getTime())) return 'All day';

    if (end && !isSameDay(start, end)) {
      return `${format(start, 'd MMM')} – ${format(end, 'd MMM')} · All day`;
    }
    return `${format(start, 'd MMM')} · All day`;
  }

  if (!event.startsAt) return 'No time set';
  const zone = event.timezone ?? DEVICE_TIMEZONE;
  const startLabel = formatInZone(event.startsAt, zone, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: !use24Hour,
  });

  if (!event.endsAt) return startLabel;
  const sameDay =
    formatInZone(event.startsAt, zone, { dateStyle: 'short' }) ===
    formatInZone(event.endsAt, zone, { dateStyle: 'short' });

  const endLabel = formatInZone(
    event.endsAt,
    zone,
    sameDay
      ? { hour: '2-digit', minute: '2-digit', hour12: !use24Hour }
      : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: !use24Hour },
  );

  return `${startLabel} – ${endLabel}`;
}

/** Calendar date an event occupies, for grid bucketing. */
export function eventDateKey(event: CalendarEvent): string {
  if (event.allDay && event.startsOn) return event.startsOn;
  if (event.startsAt) return toDateKey(new Date(event.startsAt));
  return '';
}

export function messageDayLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (isSameDay(date, now)) return 'Today';
  if (isSameDay(date, new Date(now.getTime() - 86_400_000))) return 'Yesterday';
  return format(date, 'd MMMM yyyy');
}

export interface MonthCell {
  key: string;
  date: Date;
  inMonth: boolean;
}

/** Six-week grid so month height never jumps between months. */
export function buildMonthGrid(anchor: Date, weekStartsOn: WeekStart = 1): MonthCell[] {
  const gridStart = startOfWeek(startOfMonth(anchor), { weekStartsOn });
  const gridEnd = endOfWeek(endOfMonth(anchor), { weekStartsOn });
  return eachDayOfInterval({ start: gridStart, end: gridEnd }).map((date) => ({
    key: toDateKey(date),
    date,
    inMonth: isSameMonth(date, anchor),
  }));
}

export function shiftMonth(anchor: Date, delta: number): Date {
  return addMonths(anchor, delta);
}

/** Day the week starts on: Sunday, Monday or Saturday. */
export type WeekStart = 0 | 1 | 6;

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Seven weekday initials in display order for the configured first day. */
export function weekdayLabels(weekStartsOn: WeekStart): string[] {
  return Array.from({ length: 7 }, (_, index) => WEEKDAY_INITIALS[(weekStartsOn + index) % 7] ?? '');
}
