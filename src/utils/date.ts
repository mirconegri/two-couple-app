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

/** Parse a `HH:mm` clock string safely into clamped 24h hours and minutes. */
export function parseTimeString(time: string): { hours: number; minutes: number } {
  const [rawHours, rawMinutes] = time.split(':').map((part) => Number.parseInt(part, 10));
  const hours = Number.isFinite(rawHours) ? Math.min(23, Math.max(0, rawHours!)) : 0;
  const minutes = Number.isFinite(rawMinutes) ? Math.min(59, Math.max(0, rawMinutes!)) : 0;
  return { hours, minutes };
}

/** Format 24h hours and minutes into `HH:mm`, wrapping overflow cleanly. */
export function formatTime24(hours: number, minutes: number): string {
  const total = (((hours * 60 + minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Shift end time when start time changes, preserving the current event duration. */
export function shiftEndTimeForStart(
  oldStart: string,
  newStart: string,
  currentEnd: string,
): string {
  const prev = parseTimeString(oldStart);
  const next = parseTimeString(newStart);
  const end = parseTimeString(currentEnd);
  const prevMin = prev.hours * 60 + prev.minutes;
  const endMin = end.hours * 60 + end.minutes;
  const durationMin = (((endMin - prevMin) % 1440) + 1440) % 1440 || 60;
  return formatTime24(next.hours, next.minutes + durationMin);
}

/**
 * Accept any chosen end time (including overnight past midnight), only bumping
 * by 1 hour if the user picks the exact same minute as startTime.
 */
export function resolveEndTime(startTime: string, pickedEnd: string): string {
  const start = parseTimeString(startTime);
  const end = parseTimeString(pickedEnd);
  if (start.hours === end.hours && start.minutes === end.minutes) {
    return formatTime24(start.hours + 1, start.minutes);
  }
  return formatTime24(end.hours, end.minutes);
}

/** True when end clock time falls before start clock time (wraps into next day). */
export function isOvernightRange(startTime: string, endTime: string): boolean {
  const start = parseTimeString(startTime);
  const end = parseTimeString(endTime);
  return end.hours * 60 + end.minutes < start.hours * 60 + start.minutes;
}
