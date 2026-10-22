-- ---------------------------------------------------------------------------
-- 0008 — Notes
--
-- Shared notes space (text and checklists) editable by both partners.
-- ---------------------------------------------------------------------------

create table if not exists public.notes (
  id          uuid primary key,
  couple_id   uuid not null references public.couples(id) on delete cascade,
  created_by  uuid not null references auth.users(id) on delete cascade,
  title       text not null check (length(btrim(title)) between 1 and 200),
  kind        text not null check (kind in ('text','checklist')),
  body        text,
  checklist   jsonb,
  color       text check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,

  constraint notes_kind_shape check (
    (kind = 'text' and checklist is null) or
    (kind = 'checklist' and body is null)
  )
);

create index if not exists notes_couple_updated_idx
  on public.notes (couple_id, updated_at desc);

alter table public.notes enable row level security;

revoke all on public.notes from anon;
grant select on public.notes to authenticated;

create policy notes_select on public.notes
  for select to authenticated
  using (public.is_couple_member(couple_id));

create or replace function public.push_note(
  p_id         uuid,
  p_title      text,
  p_kind       text,
  p_body       text,
  p_checklist  jsonb,
  p_color      text,
  p_deleted_at timestamptz default null
)
returns public.notes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid        uuid := (select auth.uid());
  v_couple_id  uuid;
  v_existing   public.notes%rowtype;
  v_created_by uuid;
  v_row        public.notes;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select public.current_couple_id() into v_couple_id;
  if v_couple_id is null then
    raise exception 'not a member of any private space' using errcode = '42501';
  end if;

  if p_kind not in ('text', 'checklist') then
    raise exception 'invalid note kind' using errcode = '22023';
  end if;

  if p_kind = 'text' and p_checklist is not null then
    raise exception 'text note cannot have checklist' using errcode = '22023';
  end if;

  if p_kind = 'checklist' and p_body is not null then
    raise exception 'checklist note cannot have body' using errcode = '22023';
  end if;

  select * into v_existing from public.notes where id = p_id;

  if found then
    if v_existing.couple_id <> v_couple_id then
      raise exception 'note belongs to another space' using errcode = '42501';
    end if;
    v_created_by := v_existing.created_by;
  else
    v_created_by := v_uid;
  end if;

  insert into public.notes as n
    (id, couple_id, created_by, title, kind, body, checklist, color, updated_at, deleted_at)
  values
    (p_id, v_couple_id, v_created_by, btrim(p_title), p_kind, p_body, p_checklist, p_color, now(), p_deleted_at)
  on conflict (id) do update
    set title      = excluded.title,
        kind       = excluded.kind,
        body       = excluded.body,
        checklist  = excluded.checklist,
        color      = excluded.color,
        deleted_at = excluded.deleted_at,
        updated_at = now()
    where n.couple_id = v_couple_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'note could not be written' using errcode = '42501';
  end if;

  return v_row;
end;
$$;

revoke all on function public.push_note(uuid, text, text, text, jsonb, text, timestamptz) from public, anon;
grant execute on function public.push_note(uuid, text, text, text, jsonb, text, timestamptz) to authenticated;

do $$
begin
  begin
    alter publication supabase_realtime add table public.notes;
  exception when duplicate_object then null;
  end;
end;
$$;

alter table public.notes replica identity full;
