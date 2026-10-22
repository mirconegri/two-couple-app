import type { AppDatabase } from '../db';
import {
  markMessageFailed,
  markMessageSent,
  applyRemoteMessage,
} from '../db/messages';
import {
  applyRemoteEvent,
  markEventSent,
} from '../db/events';
import {
  applyRemoteNote,
  markNoteSent,
} from '../db/notes';
import {
  claimDueEntries,
  deleteOutboxEntry,
  scheduleRetry,
} from '../db/outbox';
import type { PushEventPayload } from '../db/events';
import type { PushNotePayload } from '../db/notes';
import { newestTimestamp } from './merge';
import { nextAttemptAt, MAX_ATTEMPTS_BEFORE_FAILED } from './backoff';
import { errorMessage } from '../utils/errors';
import type { RemotePort } from './remote';

export interface SyncResult {
  pushed: number;
  pushFailures: number;
  pulledMessages: number;
  pulledEvents: number;
  pulledNotes: number;
  pulledMembers: number;
  error: string | null;
}

const EMPTY_RESULT: SyncResult = {
  pushed: 0,
  pushFailures: 0,
  pulledMessages: 0,
  pulledEvents: 0,
  pulledNotes: 0,
  pulledMembers: 0,
  error: null,
};

export async function getSyncCursor(
  db: AppDatabase,
  key: string,
): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'select value from sync_state where key = ?',
    key,
  );
  return row?.value ?? null;
}

export async function setSyncCursor(
  db: AppDatabase,
  key: string,
  value: string | null,
): Promise<void> {
  if (!value) return;
  await db.runAsync(
    `insert into sync_state (key, value) values (?, ?)
     on conflict (key) do update set value = excluded.value`,
    key,
    value,
  );
}

/**
 * Drain the outbox.
 *
 * Every entry is idempotent: the row id is client-generated, so re-sending
 * after a timeout upserts the same record instead of creating a second one.
 * A failure is retried with exponential backoff and only surfaced to the user
 * as 'failed' after several attempts, so a single dropped packet does not
 * paint the thread red.
 */
export async function drainOutbox(
  db: AppDatabase,
  remote: RemotePort,
): Promise<{ pushed: number; failures: number; error: string | null }> {
  const entries = await claimDueEntries(db, 25);

  let pushed = 0;
  let failures = 0;
  let lastError: string | null = null;

  for (const entry of entries) {
    try {
      if (entry.entity === 'message') {
        const payload = JSON.parse(entry.payload) as {
          id: string;
          body: string;
          clientCreatedAt: string;
        };

        const result = await remote.pushMessage(payload);
        await markMessageSent(db, payload.id, result.serverCreatedAt);
        await deleteOutboxEntry(db, entry.id);
        pushed += 1;
        continue;
      }

      if (entry.entity === 'event') {
        const payload = JSON.parse(entry.payload) as PushEventPayload & {
          deletedAt: string | null;
        };

        await remote.pushEvent(payload);
        await markEventSent(db, payload.id);
        await deleteOutboxEntry(db, entry.id);
        pushed += 1;
        continue;
      }

      if (entry.entity === 'note') {
        const payload = JSON.parse(entry.payload) as PushNotePayload;

        await remote.pushNote(payload);
        await markNoteSent(db, payload.id);
        await deleteOutboxEntry(db, entry.id);
        pushed += 1;
        continue;
      }

      // Unknown entity type: drop it rather than blocking the queue forever.
      await deleteOutboxEntry(db, entry.id);
    } catch (error) {
      failures += 1;
      lastError = errorMessage(error);
      const attempts = entry.attempts + 1;

      await scheduleRetry(
        db,
        entry.id,
        attempts,
        nextAttemptAt(attempts),
        lastError,
      );

      if (entry.entity === 'message' && attempts >= MAX_ATTEMPTS_BEFORE_FAILED) {
        await markMessageFailed(db, entry.entityId, lastError);
      }
    }
  }

  return { pushed, failures, error: lastError };
}

/**
 * Pull authoritative state.
 *
 * This is the part that must work without Realtime. A Realtime event is only
 * a hint to call this function; it is never treated as the data itself.
 */
export async function pullChanges(
  db: AppDatabase,
  remote: RemotePort,
  coupleId: string,
): Promise<{ messages: number; events: number; notes: number; error: string | null }> {
  try {
    const [messageCursor, eventCursor, noteCursor] = await Promise.all([
      getSyncCursor(db, 'messages'),
      getSyncCursor(db, 'events'),
      getSyncCursor(db, 'notes'),
    ]);

    const [messages, events, notes] = await Promise.all([
      remote.fetchMessagesSince(coupleId, messageCursor),
      remote.fetchEventsSince(coupleId, eventCursor),
      remote.fetchNotesSince(coupleId, noteCursor),
    ]);

    await db.withExclusiveTransactionAsync(async () => {
      for (const message of messages) {
        await applyRemoteMessage(db, message);
      }
      for (const event of events) {
        await applyRemoteEvent(db, event);
      }
      for (const note of notes) {
        await applyRemoteNote(db, note);
      }
    });

    await setSyncCursor(
      db,
      'messages',
      newestTimestamp(messages.map((m) => m.updatedAt), messageCursor),
    );
    await setSyncCursor(
      db,
      'events',
      newestTimestamp(events.map((e) => e.updatedAt), eventCursor),
    );
    await setSyncCursor(
      db,
      'notes',
      newestTimestamp(notes.map((n) => n.updatedAt), noteCursor),
    );

    return { messages: messages.length, events: events.length, notes: notes.length, error: null };
  } catch (error) {
    return { messages: 0, events: 0, notes: 0, error: errorMessage(error) };
  }
}

/**
 * Pull authoritative membership.
 *
 * Rewrites the local members table so that offline rendering and partner
 * detection stay up to date.
 */
export async function pullMembers(
  db: AppDatabase,
  remote: RemotePort,
  coupleId: string,
): Promise<{ members: number; error: string | null }> {
  try {
    const members = await remote.fetchMembers(coupleId);

    await db.withExclusiveTransactionAsync(async () => {
      await db.runAsync('delete from members where couple_id = ?', coupleId);
      for (const member of members) {
        await db.runAsync(
          `insert into members (user_id, email, display_name, couple_id, joined_at)
           values (?, ?, ?, ?, ?)
           on conflict (user_id) do update set
             couple_id = excluded.couple_id,
             email = excluded.email,
             display_name = excluded.display_name,
             joined_at = excluded.joined_at`,
          member.userId,
          member.email,
          member.displayName,
          member.coupleId,
          member.joinedAt,
        );
      }
    });

    return { members: members.length, error: null };
  } catch (error) {
    return { members: 0, error: errorMessage(error) };
  }
}

/** Push everything pending, then pull everything new. */
export async function runSyncCycle(
  db: AppDatabase,
  remote: RemotePort,
  coupleId: string | null,
): Promise<SyncResult> {
  if (!coupleId) return EMPTY_RESULT;

  const push = await drainOutbox(db, remote);
  const pull = await pullChanges(db, remote, coupleId);
  const members = await pullMembers(db, remote, coupleId);

  return {
    pushed: push.pushed,
    pushFailures: push.failures,
    pulledMessages: pull.messages,
    pulledEvents: pull.events,
    pulledNotes: pull.notes,
    pulledMembers: members.members,
    error: push.error ?? pull.error ?? members.error,
  };
}
