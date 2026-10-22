import type { AppDatabase } from './index';
import type { CalendarEvent, EventDraft, EventVisibility, SyncStatus } from '../types';

interface EventRow {
  id: string;
  couple_id: string;
  created_by: string;
  title: string;
  description: string | null;
  location: string | null;
  all_day: number;
  starts_on: string | null;
  ends_on: string | null;
  starts_at: string | null;
  ends_at: string | null;
  timezone: string | null;
  visibility: string;
  category: string | null;
  color: string | null;
  reminder_minutes: string;
  updated_at: string;
  deleted_at: string | null;
  sync_status: string;
}

const COLUMNS = `id, couple_id, created_by, title, description, location,
  all_day, starts_on, ends_on, starts_at, ends_at, timezone,
  visibility, category, color, reminder_minutes, updated_at, deleted_at, sync_status`;

function parseReminderMinutes(raw: string): number[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is number => typeof value === 'number');
  } catch {
    return [];
  }
}

export function mapEventRow(row: EventRow): CalendarEvent {
  return {
    id: row.id,
    coupleId: row.couple_id,
    createdBy: row.created_by,
    title: row.title,
    description: row.description,
    location: row.location,
    allDay: row.all_day === 1,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    timezone: row.timezone,
    visibility: row.visibility as EventVisibility,
    category: row.category,
    color: row.color,
    reminderMinutes: parseReminderMinutes(row.reminder_minutes),
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    syncStatus: row.sync_status as SyncStatus,
  };
}

export async function listEvents(
  db: AppDatabase,
  coupleId: string,
): Promise<CalendarEvent[]> {
  const rows = await db.getAllAsync<EventRow>(
    `select ${COLUMNS} from events
      where couple_id = ? and deleted_at is null
      order by coalesce(starts_at, starts_on) asc`,
    coupleId,
  );
  return rows.map(mapEventRow);
}

export async function getEvent(
  db: AppDatabase,
  id: string,
): Promise<CalendarEvent | null> {
  const row = await db.getFirstAsync<EventRow>(
    `select ${COLUMNS} from events where id = ?`,
    id,
  );
  return row ? mapEventRow(row) : null;
}

/** Write the event locally and queue its sync in one exclusive transaction. */
export async function enqueueEvent(
  db: AppDatabase,
  event: CalendarEvent,
): Promise<void> {
  const now = new Date().toISOString();

  await db.withExclusiveTransactionAsync(async (txn) => {
    const existing = await txn.getFirstAsync<{ created_by: string }>(
      'select created_by from events where id = ?',
      event.id,
    );
    const createdBy = existing ? existing.created_by : event.createdBy;

    await txn.runAsync(
      `insert into events
         (id, couple_id, created_by, title, description, location,
          all_day, starts_on, ends_on, starts_at, ends_at, timezone,
          visibility, category, color, reminder_minutes, updated_at, deleted_at, sync_status)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null, 'pending')
       on conflict (id) do update set
         title            = excluded.title,
         description      = excluded.description,
         location         = excluded.location,
         all_day          = excluded.all_day,
         starts_on        = excluded.starts_on,
         ends_on          = excluded.ends_on,
         starts_at        = excluded.starts_at,
         ends_at          = excluded.ends_at,
         timezone         = excluded.timezone,
         visibility       = excluded.visibility,
         category         = excluded.category,
         color            = excluded.color,
         reminder_minutes = excluded.reminder_minutes,
         updated_at       = excluded.updated_at,
         sync_status      = 'pending'`,
      event.id,
      event.coupleId,
      createdBy,
      event.title,
      event.description,
      event.location,
      event.allDay ? 1 : 0,
      event.startsOn,
      event.endsOn,
      event.startsAt,
      event.endsAt,
      event.timezone,
      event.visibility,
      event.category,
      event.color,
      JSON.stringify(event.reminderMinutes),
      now,
    );

    await txn.runAsync(
      `insert into outbox
         (entity, entity_id, op, payload, attempts, last_error, next_attempt_at, created_at)
       values ('event', ?, 'upsert', ?, 0, null, ?, ?)
       on conflict (entity, entity_id) do update set
         payload         = excluded.payload,
         attempts        = 0,
         last_error      = null,
         next_attempt_at = excluded.next_attempt_at`,
      event.id,
      JSON.stringify(toPushEventPayload(event)),
      now,
      now,
    );
  });
}

export interface PushEventPayload {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  allDay: boolean;
  startsOn: string | null;
  endsOn: string | null;
  startsAt: string | null;
  endsAt: string | null;
  timezone: string | null;
  visibility: EventVisibility;
  category: string | null;
  color: string | null;
  reminderMinutes: number[];
}

export function toPushEventPayload(
  event: CalendarEvent | EventDraft,
  deletedAt: string | null = null,
): PushEventPayload & { deletedAt: string | null } {
  const visibility = event.visibility;
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    location: event.location,
    allDay: event.allDay,
    startsOn: event.startsOn,
    endsOn: event.endsOn,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    timezone: event.timezone,
    visibility,
    category: event.category,
    color: event.color,
    reminderMinutes: event.reminderMinutes,
    deletedAt,
  };
}

export async function markEventSent(db: AppDatabase, id: string): Promise<void> {
  await db.runAsync(
    `update events set sync_status = 'sent' where id = ?`,
    id,
  );
}

/** Tombstone a local event and queue the deletion for sync. */
export async function enqueueEventDeletion(
  db: AppDatabase,
  event: CalendarEvent,
): Promise<void> {
  const now = new Date().toISOString();

  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      `update events set deleted_at = ?, sync_status = 'pending' where id = ?`,
      now,
      event.id,
    );

    await txn.runAsync(
      `insert into outbox
         (entity, entity_id, op, payload, attempts, last_error, next_attempt_at, created_at)
       values ('event', ?, 'upsert', ?, 0, null, ?, ?)
       on conflict (entity, entity_id) do update set
         payload         = excluded.payload,
         attempts        = 0,
         next_attempt_at = excluded.next_attempt_at`,
      event.id,
      JSON.stringify(toPushEventPayload(event, now)),
      now,
      now,
    );
  });
}

/**
 * Apply a server row. Tombstones are kept so a deletion made on the partner's
 * device removes the event here too.
 */
export async function applyRemoteEvent(
  db: AppDatabase,
  event: CalendarEvent,
): Promise<void> {
  await db.runAsync(
    `insert into events
       (id, couple_id, created_by, title, description, location,
        all_day, starts_on, ends_on, starts_at, ends_at, timezone,
        visibility, category, color, reminder_minutes, updated_at, deleted_at, sync_status)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent')
     on conflict (id) do update set
       title            = excluded.title,
       description      = excluded.description,
       location         = excluded.location,
       all_day          = excluded.all_day,
       starts_on        = excluded.starts_on,
       ends_on          = excluded.ends_on,
       starts_at        = excluded.starts_at,
       ends_at          = excluded.ends_at,
       timezone         = excluded.timezone,
       visibility       = excluded.visibility,
       category         = excluded.category,
       color            = excluded.color,
       reminder_minutes = excluded.reminder_minutes,
       updated_at       = excluded.updated_at,
       deleted_at       = excluded.deleted_at,
       sync_status      = 'sent'`,
    event.id,
    event.coupleId,
    event.createdBy,
    event.title,
    event.description,
    event.location,
    event.allDay ? 1 : 0,
    event.startsOn,
    event.endsOn,
    event.startsAt,
    event.endsAt,
    event.timezone,
    event.visibility,
    event.category,
    event.color,
    JSON.stringify(event.reminderMinutes),
    event.updatedAt,
    event.deletedAt,
  );
}

export async function purgeDeletedEvents(
  db: AppDatabase,
  olderThanIso: string,
): Promise<void> {
  await db.runAsync(
    `delete from events where deleted_at is not null and deleted_at < ?`,
    olderThanIso,
  );
}
