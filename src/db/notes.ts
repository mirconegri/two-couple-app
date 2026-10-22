import type { AppDatabase } from './index';
import type { Note, NoteChecklistItem, NoteKind, SyncStatus } from '../types';

interface NoteRow {
  id: string;
  couple_id: string;
  created_by: string;
  title: string;
  kind: string;
  body: string | null;
  checklist: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_status: string;
}

const COLUMNS = `id, couple_id, created_by, title, kind, body, checklist, color,
  created_at, updated_at, deleted_at, sync_status`;

function parseChecklist(raw: string | null): NoteChecklistItem[] | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed as NoteChecklistItem[];
  } catch {
    return null;
  }
}

export function mapNoteRow(row: NoteRow): Note {
  return {
    id: row.id,
    coupleId: row.couple_id,
    createdBy: row.created_by,
    title: row.title,
    kind: row.kind as NoteKind,
    body: row.body,
    checklist: parseChecklist(row.checklist),
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    syncStatus: row.sync_status as SyncStatus,
  };
}

export async function listNotes(
  db: AppDatabase,
  coupleId: string,
): Promise<Note[]> {
  const rows = await db.getAllAsync<NoteRow>(
    `select ${COLUMNS} from notes
      where couple_id = ? and deleted_at is null
      order by updated_at desc`,
    coupleId,
  );
  return rows.map(mapNoteRow);
}

export async function getNote(
  db: AppDatabase,
  id: string,
): Promise<Note | null> {
  const row = await db.getFirstAsync<NoteRow>(
    `select ${COLUMNS} from notes where id = ?`,
    id,
  );
  return row ? mapNoteRow(row) : null;
}

export interface PushNotePayload {
  id: string;
  title: string;
  kind: NoteKind;
  body: string | null;
  checklist: NoteChecklistItem[] | null;
  color: string | null;
  deletedAt: string | null;
}

export function toPushNotePayload(
  note: Note,
  deletedAt: string | null = null,
): PushNotePayload {
  return {
    id: note.id,
    title: note.title,
    kind: note.kind,
    body: note.body,
    checklist: note.checklist,
    color: note.color,
    deletedAt,
  };
}

export async function enqueueNote(
  db: AppDatabase,
  note: Note,
): Promise<void> {
  const now = new Date().toISOString();

  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      `insert into notes
         (id, couple_id, created_by, title, kind, body, checklist, color,
          created_at, updated_at, deleted_at, sync_status)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null, 'pending')
       on conflict (id) do update set
         title       = excluded.title,
         kind        = excluded.kind,
         body        = excluded.body,
         checklist   = excluded.checklist,
         color       = excluded.color,
         updated_at  = excluded.updated_at,
         sync_status = 'pending'`,
      note.id,
      note.coupleId,
      note.createdBy,
      note.title,
      note.kind,
      note.body,
      note.checklist ? JSON.stringify(note.checklist) : null,
      note.color,
      note.createdAt || now,
      now,
    );

    await txn.runAsync(
      `insert into outbox
         (entity, entity_id, op, payload, attempts, last_error, next_attempt_at, created_at)
       values ('note', ?, 'upsert', ?, 0, null, ?, ?)
       on conflict (entity, entity_id) do update set
         payload         = excluded.payload,
         attempts        = 0,
         last_error      = null,
         next_attempt_at = excluded.next_attempt_at`,
      note.id,
      JSON.stringify(toPushNotePayload(note)),
      now,
      now,
    );
  });
}

export async function markNoteSent(db: AppDatabase, id: string): Promise<void> {
  await db.runAsync(
    `update notes set sync_status = 'sent' where id = ?`,
    id,
  );
}

export async function enqueueNoteDeletion(
  db: AppDatabase,
  note: Note,
): Promise<void> {
  const now = new Date().toISOString();

  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      `update notes set deleted_at = ?, sync_status = 'pending' where id = ?`,
      now,
      note.id,
    );

    await txn.runAsync(
      `insert into outbox
         (entity, entity_id, op, payload, attempts, last_error, next_attempt_at, created_at)
       values ('note', ?, 'upsert', ?, 0, null, ?, ?)
       on conflict (entity, entity_id) do update set
         payload         = excluded.payload,
         attempts        = 0,
         next_attempt_at = excluded.next_attempt_at`,
      note.id,
      JSON.stringify(toPushNotePayload(note, now)),
      now,
      now,
    );
  });
}

export async function applyRemoteNote(
  db: AppDatabase,
  note: Note,
): Promise<void> {
  await db.runAsync(
    `insert into notes
       (id, couple_id, created_by, title, kind, body, checklist, color,
        created_at, updated_at, deleted_at, sync_status)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent')
     on conflict (id) do update set
       title       = excluded.title,
       kind        = excluded.kind,
       body        = excluded.body,
       checklist   = excluded.checklist,
       color       = excluded.color,
       updated_at  = excluded.updated_at,
       deleted_at  = excluded.deleted_at,
       sync_status = 'sent'`,
    note.id,
    note.coupleId,
    note.createdBy,
    note.title,
    note.kind,
    note.body,
    note.checklist ? JSON.stringify(note.checklist) : null,
    note.color,
    note.createdAt,
    note.updatedAt,
    note.deletedAt,
  );
}
