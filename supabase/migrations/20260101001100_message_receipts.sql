-- ---------------------------------------------------------------------------
-- 0011 — Message delivery and read receipts
-- ---------------------------------------------------------------------------

alter table public.messages
  add column if not exists delivered_at timestamptz,
  add column if not exists read_at timestamptz;

create index if not exists messages_receipts_idx
  on public.messages (couple_id, sender_id, delivered_at, read_at);

-- RPC to mark incoming messages as delivered
create or replace function public.mark_messages_delivered(
  p_until timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := (select auth.uid());
  v_couple_id uuid;
  v_count     integer;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select public.current_couple_id() into v_couple_id;
  if v_couple_id is null then
    raise exception 'not a member of any private space' using errcode = '42501';
  end if;

  update public.messages
     set delivered_at = coalesce(delivered_at, now()),
         updated_at = now()
   where couple_id = v_couple_id
     and sender_id <> v_uid
     and delivered_at is null
     and client_created_at <= p_until;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.mark_messages_delivered(timestamptz) from public, anon;
grant execute on function public.mark_messages_delivered(timestamptz) to authenticated;

-- RPC to mark incoming messages as read
create or replace function public.mark_messages_read(
  p_until timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := (select auth.uid());
  v_couple_id uuid;
  v_count     integer;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select public.current_couple_id() into v_couple_id;
  if v_couple_id is null then
    raise exception 'not a member of any private space' using errcode = '42501';
  end if;

  update public.messages
     set read_at = coalesce(read_at, now()),
         delivered_at = coalesce(delivered_at, now()),
         updated_at = now()
   where couple_id = v_couple_id
     and sender_id <> v_uid
     and read_at is null
     and client_created_at <= p_until;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.mark_messages_read(timestamptz) from public, anon;
grant execute on function public.mark_messages_read(timestamptz) to authenticated;
