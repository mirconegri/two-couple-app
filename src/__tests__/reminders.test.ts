import { reminderFireDate, reminderIdentifier } from '../notifications/reminders';
import type { CalendarEvent } from '../types';

function makeEvent(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: 'event-1',
    coupleId: 'couple',
    createdBy: 'user',
    title: 'Dinner',
    description: null,
    location: null,
    allDay: false,
    startsOn: null,
    endsOn: null,
    startsAt: null,
    endsAt: null,
    timezone: 'Europe/Rome',
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

describe('reminderIdentifier', () => {
  it('is stable for the same event and offset', () => {
    expect(reminderIdentifier('abc', 10)).toBe(reminderIdentifier('abc', 10));
  });

  it('differs per offset so rescheduling replaces rather than duplicates', () => {
    expect(reminderIdentifier('abc', 10)).not.toBe(reminderIdentifier('abc', 60));
  });
});

describe('reminderFireDate', () => {
  it('subtracts the offset from a timed event start', () => {
    const start = '2026-05-01T18:00:00.000Z';
    const fire = reminderFireDate(makeEvent({ startsAt: start }), 60);
    expect(fire?.toISOString()).toBe('2026-05-01T17:00:00.000Z');
  });

  it('anchors an all-day event to 09:00 local on its start date', () => {
    const fire = reminderFireDate(
      makeEvent({ allDay: true, startsOn: '2026-05-01', endsOn: '2026-05-01' }),
      0,
    );
    expect(fire).not.toBeNull();
    expect(fire?.getHours()).toBe(9);
    expect(fire?.getDate()).toBe(1);
  });

  it('returns null when there is nothing to anchor to', () => {
    expect(reminderFireDate(makeEvent({}), 10)).toBeNull();
  });

  it('handles an all-day event on a DST transition date', () => {
    const fire = reminderFireDate(
      makeEvent({ allDay: true, startsOn: '2026-03-29', endsOn: '2026-03-29' }),
      0,
    );
    expect(fire?.getDate()).toBe(29);
  });
});
