/**
 * Local SQLite schema.
 *
 * Each entry is one migration. The index in this array IS the schema version:
 * the migrator compares `PRAGMA user_version` against MIGRATIONS.length and
 * runs only what is missing. Never edit a released entry — append a new one.
 *
 * `sync_status` is local-only. The server never sees it.
 */
export const MIGRATIONS: readonly string[] = [
  `
  create table if not exists local_meta (
    key   text primary key,
    value text
  );

  create table if not exists members (
    user_id      text primary key,
    email        text,
    display_name text,
    couple_id    text not null,
    joined_at    text not null
  );

  create table if not exists messages (
    id                text primary key,
    couple_id         text not null,
    sender_id         text not null,
    body              text not null,
    client_created_at text not null,
    server_created_at text,
    updated_at        text not null,
    deleted_at        text,
    sync_status       text not null default 'pending',
    failure_reason    text
  );

  create index if not exists messages_couple_created_idx
    on messages (couple_id, client_created_at desc);

  create table if not exists events (
    id               text primary key,
    couple_id        text not null,
    created_by       text not null,
    title            text not null,
    description      text,
    location         text,
    all_day          integer not null default 0,
    starts_on        text,
    ends_on          text,
    starts_at        text,
    ends_at          text,
    timezone         text,
    visibility       text not null default 'shared',
    category         text,
    color            text,
    reminder_minutes text not null default '[]',
    updated_at       text not null,
    deleted_at       text,
    sync_status      text not null default 'pending'
  );

  create index if not exists events_couple_starts_idx
    on events (couple_id, starts_at);

  create index if not exists events_couple_starts_on_idx
    on events (couple_id, starts_on);

  create table if not exists outbox (
    id              integer primary key autoincrement,
    entity          text not null,
    entity_id       text not null,
    op              text not null,
    payload         text not null,
    attempts        integer not null default 0,
    last_error      text,
    next_attempt_at text not null,
    created_at      text not null
  );

  -- One pending operation per entity: editing the same event twice while
  -- offline coalesces into a single upsert instead of two.
  create unique index if not exists outbox_entity_unique
    on outbox (entity, entity_id);

  create index if not exists outbox_next_idx
    on outbox (next_attempt_at);

  create table if not exists sync_state (
    key   text primary key,
    value text
  );
  `,
];
