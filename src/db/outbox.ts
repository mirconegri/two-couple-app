import type { AppDatabase } from './index';

export type OutboxEntity = 'message' | 'event';

export interface OutboxEntry {
  id: number;
  entity: OutboxEntity;
  entityId: string;
  op: string;
  payload: string;
  attempts: number;
  nextAttemptAt: string;
}

interface OutboxRow {
  id: number;
  entity: string;
  entity_id: string;
  op: string;
  payload: string;
  attempts: number;
  next_attempt_at: string;
}

export async function claimDueEntries(
  db: AppDatabase,
  limit = 25,
): Promise<OutboxEntry[]> {
  const rows = await db.getAllAsync<OutboxRow>(
    `select id, entity, entity_id, op, payload, attempts, next_attempt_at
       from outbox
      where next_attempt_at <= ?
      order by next_attempt_at asc, id asc
      limit ?`,
    new Date().toISOString(),
    limit,
  );

  return rows.map((row) => ({
    id: row.id,
    entity: row.entity as OutboxEntity,
    entityId: row.entity_id,
    op: row.op,
    payload: row.payload,
    attempts: row.attempts,
    nextAttemptAt: row.next_attempt_at,
  }));
}

export async function deleteOutboxEntry(
  db: AppDatabase,
  id: number,
): Promise<void> {
  await db.runAsync('delete from outbox where id = ?', id);
}

export async function scheduleRetry(
  db: AppDatabase,
  entryId: number,
  attempts: number,
  nextAttemptAt: string,
  lastError: string,
): Promise<void> {
  await db.runAsync(
    `update outbox
        set attempts = ?, next_attempt_at = ?, last_error = ?
      where id = ?`,
    attempts,
    nextAttemptAt,
    lastError.slice(0, 200),
    entryId,
  );
}

export async function countPending(db: AppDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    'select count(*) as count from outbox',
  );
  return row?.count ?? 0;
}

export async function clearOutbox(db: AppDatabase): Promise<void> {
  await db.runAsync('delete from outbox');
}
