import * as SQLite from 'expo-sqlite';

import { MIGRATIONS } from './migrations';

export const DATABASE_NAME = 'twocouple.db';

export type AppDatabase = SQLite.SQLiteDatabase;

/**
 * Apply pending migrations.
 *
 * `PRAGMA user_version` is the schema version. Migrations run inside an
 * exclusive transaction so a crash mid-migration rolls back cleanly rather
 * than leaving a half-applied schema.
 */
export async function migrate(db: AppDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const applied = row?.user_version ?? 0;

  if (applied >= MIGRATIONS.length) return;

  await db.withExclusiveTransactionAsync(async (txn) => {
    for (let index = applied; index < MIGRATIONS.length; index += 1) {
      const sql = MIGRATIONS[index];
      // execAsync does NOT escape parameters — only ever run static SQL here.
      if (sql) await txn.execAsync(sql);
    }
    // PRAGMA cannot be parameterised. MIGRATIONS.length is a trusted integer.
    await txn.execAsync(`PRAGMA user_version = ${MIGRATIONS.length}`);
  });
}

/** Open, configure and migrate the local database. */
export async function openAppDatabase(): Promise<AppDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  // journal_mode cannot be changed inside a transaction, so it runs first.
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync('PRAGMA busy_timeout = 5000;');

  await migrate(db);
  return db;
}

/** Called by SQLiteProvider's onInit. */
export async function initDatabase(db: AppDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA busy_timeout = 5000;');
  await migrate(db);
}

export async function getMeta(db: AppDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'select value from local_meta where key = ?',
    key,
  );
  return row?.value ?? null;
}

export async function setMeta(
  db: AppDatabase,
  key: string,
  value: string,
): Promise<void> {
  await db.runAsync(
    `insert into local_meta (key, value) values (?, ?)
     on conflict (key) do update set value = excluded.value`,
    key,
    value,
  );
}

export async function clearLocalData(db: AppDatabase): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.execAsync(`
      delete from messages;
      delete from events;
      delete from outbox;
      delete from members;
      delete from sync_state;
      delete from local_meta;
    `);
  });
}
