import type { AppDatabase } from './index';
import type { Message, SyncStatus } from '../types';

interface MessageRow {
  id: string;
  couple_id: string;
  sender_id: string;
  body: string;
  client_created_at: string;
  server_created_at: string | null;
  updated_at: string;
  deleted_at: string | null;
  sync_status: string;
  failure_reason: string | null;
}

const COLUMNS = `id, couple_id, sender_id, body, client_created_at,
  server_created_at, updated_at, deleted_at, sync_status, failure_reason`;

export function mapMessageRow(row: MessageRow): Message {
  return {
    id: row.id,
    coupleId: row.couple_id,
    senderId: row.sender_id,
    body: row.body,
    clientCreatedAt: row.client_created_at,
    serverCreatedAt: row.server_created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    syncStatus: row.sync_status as SyncStatus,
    failureReason: row.failure_reason,
  };
}

export async function listMessages(
  db: AppDatabase,
  coupleId: string,
  limit = 40,
  before?: string | null,
): Promise<Message[]> {
  const rows = before
    ? await db.getAllAsync<MessageRow>(
        `select ${COLUMNS} from messages
          where couple_id = ? and client_created_at < ?
          order by client_created_at desc
          limit ?`,
        coupleId,
        before,
        limit,
      )
    : await db.getAllAsync<MessageRow>(
        `select ${COLUMNS} from messages
          where couple_id = ?
          order by client_created_at desc
          limit ?`,
        coupleId,
        limit,
      );

  return rows.map(mapMessageRow);
}

export async function getMessage(
  db: AppDatabase,
  id: string,
): Promise<Message | null> {
  const row = await db.getFirstAsync<MessageRow>(
    `select ${COLUMNS} from messages where id = ?`,
    id,
  );
  return row ? mapMessageRow(row) : null;
}

/**
 * Persist a locally-composed message AND its outbox entry in one exclusive
 * transaction. If the device dies mid-write, either both exist or neither does
 * — a message can never appear in the thread without being queued for sync.
 */
export async function enqueueMessage(db: AppDatabase, message: Message): Promise<void> {
  const now = new Date().toISOString();

  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      `insert into messages
         (id, couple_id, sender_id, body, client_created_at,
          server_created_at, updated_at, deleted_at, sync_status, failure_reason)
       values (?, ?, ?, ?, ?, null, ?, null, 'pending', null)
       on conflict (id) do update set
         body           = excluded.body,
         sync_status    = 'pending',
         failure_reason = null`,
      message.id,
      message.coupleId,
      message.senderId,
      message.body,
      message.clientCreatedAt,
      now,
    );

    await txn.runAsync(
      `insert into outbox
         (entity, entity_id, op, payload, attempts, last_error, next_attempt_at, created_at)
       values ('message', ?, 'upsert', ?, 0, null, ?, ?)
       on conflict (entity, entity_id) do update set
         payload         = excluded.payload,
         attempts        = 0,
         last_error      = null,
         next_attempt_at = excluded.next_attempt_at`,
      message.id,
      JSON.stringify({
        id: message.id,
        body: message.body,
        clientCreatedAt: message.clientCreatedAt,
      }),
      now,
      now,
    );
  });
}

export async function markMessageSent(
  db: AppDatabase,
  id: string,
  serverCreatedAt: string | null,
): Promise<void> {
  await db.runAsync(
    `update messages
        set sync_status = 'sent',
            server_created_at = coalesce(?, server_created_at),
            failure_reason = null
      where id = ?`,
    serverCreatedAt,
    id,
  );
}

export async function markMessageFailed(
  db: AppDatabase,
  id: string,
  reason: string,
): Promise<void> {
  await db.runAsync(
    `update messages set sync_status = 'failed', failure_reason = ? where id = ?`,
    reason.slice(0, 200),
    id,
  );
}

/** Re-queue a failed message for another attempt. */
export async function retryMessage(db: AppDatabase, id: string): Promise<void> {
  const now = new Date().toISOString();
  await db.withExclusiveTransactionAsync(async (txn) => {
    const row = await txn.getFirstAsync<MessageRow>(
      `select ${COLUMNS} from messages where id = ?`,
      id,
    );
    if (!row) return;

    await txn.runAsync(
      `update messages set sync_status = 'pending', failure_reason = null where id = ?`,
      id,
    );

    await txn.runAsync(
      `insert into outbox
         (entity, entity_id, op, payload, attempts, last_error, next_attempt_at, created_at)
       values ('message', ?, 'upsert', ?, 0, null, ?, ?)
       on conflict (entity, entity_id) do update set
         payload         = excluded.payload,
         attempts        = 0,
         next_attempt_at = excluded.next_attempt_at`,
      id,
      JSON.stringify({
        id: row.id,
        body: row.body,
        clientCreatedAt: row.client_created_at,
      }),
      now,
      now,
    );
  });
}

/**
 * Apply a row that came from the server.
 *
 * A local row that is still 'failed' keeps that state so the user can see the
 * problem; everything else becomes 'sent' because the server is authoritative.
 */
export async function applyRemoteMessage(
  db: AppDatabase,
  message: Message,
): Promise<void> {
  await db.runAsync(
    `insert into messages
       (id, couple_id, sender_id, body, client_created_at,
        server_created_at, updated_at, deleted_at, sync_status, failure_reason)
     values (?, ?, ?, ?, ?, ?, ?, ?, 'sent', null)
     on conflict (id) do update set
       body              = excluded.body,
       server_created_at = excluded.server_created_at,
       updated_at        = excluded.updated_at,
       deleted_at        = excluded.deleted_at,
       sync_status       = case
                             when messages.sync_status = 'failed' then 'failed'
                             else 'sent'
                           end`,
    message.id,
    message.coupleId,
    message.senderId,
    message.body,
    message.clientCreatedAt,
    message.serverCreatedAt,
    message.updatedAt,
    message.deletedAt,
  );
}

export async function countUnread(
  db: AppDatabase,
  coupleId: string,
  selfUserId: string,
): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    `select count(*) as count from messages
      where couple_id = ? and sender_id <> ? and deleted_at is null`,
    coupleId,
    selfUserId,
  );
  return row?.count ?? 0;
}
