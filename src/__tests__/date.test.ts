import {
  buildMonthGrid,
  formatEventRange,
  formatTime24,
  isOvernightRange,
  parseDateKey,
  parseTimeString,
  resolveEndTime,
  shiftEndTimeForStart,
  toDateKey,
} from '../utils/date';
import type { CalendarEvent } from '../types';

function makeEvent(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: 'id',
    coupleId: 'couple',
    createdBy: 'user',
    title: 'Event',
    description: null,
    location: null,
    allDay: false,
    startsOn: null,
    endsOn: null,
    startsAt: null,
    endsAt: null,
    timezone: 'UTC',
    visibility: 'shared',
    category: null,
    color: null,
    reminderMinutes: [],
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    syncStatus: 'sent',
    ...overrides,
  };
}

describe('parseDateKey', () => {
  it('parses a calendar date as local midnight, not UTC', () => {
    const parsed = parseDateKey('2026-03-15');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(2);
    expect(parsed.getDate()).toBe(15);
    expect(parsed.getHours()).toBe(0);
  });

  it('returns an invalid date for malformed input', () => {
    expect(Number.isNaN(parseDateKey('nonsense').getTime())).toBe(true);
  });
});

describe('toDateKey', () => {
  it('round-trips a local date without shifting', () => {
    expect(toDateKey(parseDateKey('2026-03-15'))).toBe('2026-03-15');
  });
});

describe('formatEventRange', () => {
  it('formats an all-day event from its date columns', () => {
    const event = makeEvent({ allDay: true, startsOn: '2026-03-15', endsOn: '2026-03-15' });
    expect(formatEventRange(event)).toContain('15 Mar');
    expect(formatEventRange(event)).toContain('All day');
  });

  it('keeps an all-day event on the intended day across a DST transition', () => {
    // 29 March 2026 is the European DST switch.
    const event = makeEvent({ allDay: true, startsOn: '2026-03-29', endsOn: '2026-03-29' });
    expect(formatEventRange(event)).toContain('29 Mar');
  });

  it('shows a multi-day all-day range', () => {
    const event = makeEvent({ allDay: true, startsOn: '2026-03-15', endsOn: '2026-03-17' });
    const label = formatEventRange(event);
    expect(label).toContain('15 Mar');
    expect(label).toContain('17 Mar');
  });
});

describe('buildMonthGrid', () => {
  it('always returns complete weeks', () => {
    const grid = buildMonthGrid(new Date(2026, 1, 1));
    expect(grid.length % 7).toBe(0);
    expect(grid.length).toBeGreaterThanOrEqual(28);
  });

  it('flags days outside the month', () => {
    const grid = buildMonthGrid(new Date(2026, 1, 15));
    expect(grid.some((cell) => cell.inMonth)).toBe(true);
    expect(grid.some((cell) => !cell.inMonth)).toBe(true);
  });
});

describe('event time helpers', () => {
  it('parses and clamps clock strings safely', () => {
    expect(parseTimeString('09:05')).toEqual({ hours: 9, minutes: 5 });
    expect(parseTimeString('25:99')).toEqual({ hours: 23, minutes: 59 });
    expect(parseTimeString('bad')).toEqual({ hours: 0, minutes: 0 });
  });

  it('formats 24h times and wraps midnight overflow', () => {
    expect(formatTime24(9, 5)).toBe('09:05');
    expect(formatTime24(24, 30)).toBe('00:30');
    expect(formatTime24(23, 75)).toBe('00:15');
  });

  it('preserves duration when shifting start time, including across midnight', () => {
    expect(shiftEndTimeForStart('18:00', '20:00', '19:30')).toBe('21:30');
    expect(shiftEndTimeForStart('18:00', '23:30', '19:00')).toBe('00:30');
    expect(shiftEndTimeForStart('23:30', '23:00', '01:00')).toBe('00:30');
  });

  it('allows overnight end times and only bumps exact duplicates', () => {
    expect(resolveEndTime('23:30', '01:00')).toBe('01:00');
    expect(isOvernightRange('23:30', '01:00')).toBe(true);
    expect(isOvernightRange('18:00', '19:00')).toBe(false);
    expect(resolveEndTime('18:00', '18:00')).toBe('19:00');
  });
});
