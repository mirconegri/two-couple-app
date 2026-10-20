import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
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
export function formatInZone(
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

export function timezoneOffsetLabel(iso: string, timeZone: string): string {
  return formatInZone(iso, timeZone, { timeZoneName: 'short' });
}

/**
 * Human label for an event.
 *
 * All-day events are formatted from their `date` columns and never pass
 * through a timezone, which is what keeps them on the right day across DST.
 */
export function formatEventRange(event: CalendarEvent): string {
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
  });

  if (!event.endsAt) return startLabel;
  const sameDay =
    formatInZone(event.startsAt, zone, { dateStyle: 'short' }) ===
    formatInZone(event.endsAt, zone, { dateStyle: 'short' });

  const endLabel = formatInZone(
    event.endsAt,
    zone,
    sameDay
      ? { hour: '2-digit', minute: '2-digit' }
      : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' },
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
export function buildMonthGrid(anchor: Date): MonthCell[] {
  const gridStart = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
  return eachDayOfInterval({ start: gridStart, end: gridEnd }).map((date) => ({
    key: toDateKey(date),
    date,
    inMonth: isSameMonth(date, anchor),
  }));
}

export function shiftMonth(anchor: Date, delta: number): Date {
  return addMonths(anchor, delta);
}

export function parseIsoSafe(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
