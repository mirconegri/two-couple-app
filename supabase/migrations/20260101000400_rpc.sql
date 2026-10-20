-- ---------------------------------------------------------------------------
-- 0004 — SECURITY DEFINER RPCs
--
-- Each function re-validates identity and membership itself. A SECURITY
-- DEFINER function bypasses RLS, so it is the only place that must be trusted
-- to enforce authorization correctly.
-- ---------------------------------------------------------------------------

-- Helper: the caller's single couple id, or null.
create or replace function public.current_couple_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.couple_id
  from public.couple_members m
  where m.user_id = (select auth.uid())
  limit 1;
$$;

revoke all on function public.current_couple_id() from public, anon;
grant execute on function public.current_couple_id() to authenticated;

-- Create a private space ---------------------------------------------------

create or replace function public.create_couple(p_name text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := (select auth.uid());
  v_couple_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if exists (select 1 from public.couple_members m where m.user_id = v_uid) then
    raise exception 'you already belong to a private space' using errcode = '23505';
  end if;

  insert into public.couples (name)
  values (nullif(btrim(coalesce(p_name, '')), ''))
  returning id into v_couple_id;

  insert into public.couple_members (couple_id, user_id)
  values (v_couple_id, v_uid);

  return v_couple_id;
end;
$$;

revoke all on function public.create_couple(text) from public, anon;
grant execute on function public.create_couple(text) to authenticated;

-- Create an invitation -----------------------------------------------------
-- Returns the raw code exactly once. Only its SHA-256 hash is stored.

create or replace function public.create_invitation(p_ttl_hours integer default 48)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid          uuid := (select auth.uid());
  v_couple_id    uuid;
  v_member_count integer;
  v_code         text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select public.current_couple_id() into v_couple_id;
  if v_couple_id is null then
    raise exception 'no private space' using errcode = 'P0002';
  end if;

  select count(*) into v_member_count
  from public.couple_members
  where couple_id = v_couple_id;

  if v_member_count >= 2 then
    raise exception 'this space already has two members' using errcode = '23505';
  end if;

  -- 24 random bytes -> url-safe base64, ~32 characters of entropy.
  v_code := encode(gen_random_bytes(24), 'base64');
  v_code := translate(v_code, '+/=', '-_');
  v_code := replace(v_code, '-', '');
  -- Re-add '-' only if needed for length; simpler: keep base64url without '='.
  v_code := encode(gen_random_bytes(24), 'base64');
  v_code := replace(replace(replace(v_code, '+', '-'), '/', '_'), '=', '');

  insert into public.invitations (couple_id, code_hash, created_by, expires_at)
  values (
    v_couple_id,
    encode(digest(v_code, 'sha256'), 'hex'),
    v_uid,
    now() + make_interval(hours => greatest(1, least(coalesce(p_ttl_hours, 48), 168)))
  );

  return v_code;
end;
$$;

revoke all on function public.create_invitation(integer) from public, anon;
grant execute on function public.create_invitation(integer) to authenticated;

-- Revoke an invitation -----------------------------------------------------

create or replace function public.revoke_invitation(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  update public.invitations
     set revoked_at = now()
   where id = p_id
     and created_by = v_uid
     and used_at is null
     and revoked_at is null;

  if not found then
    raise exception 'invitation not found or not revocable' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.revoke_invitation(uuid) from public, anon;
grant execute on function public.revoke_invitation(uuid) to authenticated;

-- Redeem an invitation -----------------------------------------------------

create or replace function public.redeem_invitation(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid          uuid := (select auth.uid());
  v_hash         text;
  v_inv          public.invitations%rowtype;
  v_member_count integer;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_code is null or length(btrim(p_code)) < 16 then
    -- Same error for malformed and unknown codes: do not leak existence.
    raise exception 'invalid invitation' using errcode = '22023';
  end if;

  if exists (select 1 from public.couple_members m where m.user_id = v_uid) then
    raise exception 'you already belong to a private space' using errcode = '23505';
  end if;

  v_hash := encode(digest(btrim(p_code), 'sha256'), 'hex');

  select * into v_inv
  from public.invitations
  where code_hash = v_hash
  for update;

  if not found then
    raise exception 'invalid invitation' using errcode = '22023';
  end if;

  -- Serialise redemptions for this space so two codes cannot both succeed.
  perform pg_advisory_xact_lock(hashtext(v_inv.couple_id::text));

  if v_inv.used_at is not null then
    raise exception 'invitation already used' using errcode = '23505';
  end if;
  if v_inv.revoked_at is not null then
    raise exception 'invitation revoked' using errcode = '22023';
  end if;
  if v_inv.expires_at <= now() then
    raise exception 'invitation expired' using errcode = '22023';
  end if;

  select count(*) into v_member_count
  from public.couple_members
  where couple_id = v_inv.couple_id;

  if v_member_count >= 2 then
    raise exception 'this space already has two members' using errcode = '23505';
  end if;

  insert into public.couple_members (couple_id, user_id)
  values (v_inv.couple_id, v_uid);

  update public.invitations
     set used_at = now(), used_by = v_uid
   where id = v_inv.id;

  return v_inv.couple_id;
end;
$$;

revoke all on function public.redeem_invitation(text) from public, anon;
grant execute on function public.redeem_invitation(text) to authenticated;

-- Push a message -----------------------------------------------------------
-- Idempotent: the client generates the uuid, so a retry re-sends the same id
-- and the ON CONFLICT branch resolves to the same row.

create or replace function public.push_message(
  p_id                uuid,
  p_body              text,
  p_client_created_at timestamptz,
  p_deleted_at        timestamptz default null
)
returns public.messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := (select auth.uid());
  v_couple_id uuid;
  v_row       public.messages;
  v_body      text := btrim(coalesce(p_body, ''));
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select public.current_couple_id() into v_couple_id;
  if v_couple_id is null then
    raise exception 'not a member of any private space' using errcode = '42501';
  end if;

  if v_body = '' then
    raise exception 'message body is empty' using errcode = '22023';
  end if;

  insert into public.messages as m
    (id, couple_id, sender_id, body, client_created_at, updated_at, deleted_at)
  values
    (p_id, v_couple_id, v_uid, v_body,
     coalesce(p_client_created_at, now()), now(), p_deleted_at)
  on conflict (id) do update
    set body       = excluded.body,
        deleted_at = excluded.deleted_at,
        updated_at = now()
    where m.sender_id = v_uid
      and m.couple_id = v_couple_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'message id belongs to another sender' using errcode = '42501';
  end if;

  return v_row;
end;
$$;

revoke all on function public.push_message(uuid, text, timestamptz, timestamptz) from public, anon;
grant execute on function public.push_message(uuid, text, timestamptz, timestamptz) to authenticated;

-- Push an event ------------------------------------------------------------
-- Both partners may edit a shared event. Neither may touch the other's
-- private event — that is enforced here, not in the UI.

create or replace function public.push_event(
  p_id               uuid,
  p_title            text,
  p_description      text,
  p_location         text,
  p_all_day          boolean,
  p_starts_on        date,
  p_ends_on          date,
  p_starts_at        timestamptz,
  p_ends_at          timestamptz,
  p_timezone         text,
  p_visibility       text,
  p_category         text,
  p_color            text,
  p_reminder_minutes integer[],
  p_deleted_at       timestamptz default null
)
returns public.events
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := (select auth.uid());
  v_couple_id uuid;
  v_existing  public.events%rowtype;
  v_created_by uuid;
  v_row       public.events;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select public.current_couple_id() into v_couple_id;
  if v_couple_id is null then
    raise exception 'not a member of any private space' using errcode = '42501';
  end if;

  if p_visibility not in ('shared', 'private') then
    raise exception 'invalid visibility' using errcode = '22023';
  end if;

  select * into v_existing from public.events where id = p_id;

  if found then
    if v_existing.couple_id <> v_couple_id then
      raise exception 'event belongs to another space' using errcode = '42501';
    end if;
    if v_existing.created_by <> v_uid and v_existing.visibility = 'private' then
      raise exception 'cannot modify a private event' using errcode = '42501';
    end if;
    v_created_by := v_existing.created_by;
  else
    v_created_by := v_uid;
  end if;

  insert into public.events as e
    (id, couple_id, created_by, title, description, location,
     all_day, starts_on, ends_on, starts_at, ends_at, timezone,
     visibility, category, color, reminder_minutes, updated_at, deleted_at)
  values
    (p_id, v_couple_id, v_created_by, btrim(p_title), p_description, p_location,
     coalesce(p_all_day, false), p_starts_on, p_ends_on, p_starts_at, p_ends_at, p_timezone,
     p_visibility, p_category, p_color, coalesce(p_reminder_minutes, '{}'), now(), p_deleted_at)
  on conflict (id) do update
    set title            = excluded.title,
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
        deleted_at       = excluded.deleted_at,
        updated_at       = now()
    where e.couple_id = v_couple_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'event could not be written' using errcode = '42501';
  end if;

  return v_row;
end;
$$;

revoke all on function public.push_event(
  uuid, text, text, text, boolean, date, date, timestamptz, timestamptz,
  text, text, text, text, integer[], timestamptz
) from public, anon;

grant execute on function public.push_event(
  uuid, text, text, text, boolean, date, date, timestamptz, timestamptz,
  text, text, text, text, integer[], timestamptz
) to authenticated;

-- Leave a space (used for "remove this device" / account cleanup) ----------

create or replace function public.leave_couple()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  delete from public.couple_members where user_id = v_uid;
  delete from public.push_tokens where user_id = v_uid;
end;
$$;

revoke all on function public.leave_couple() from public, anon;
grant execute on function public.leave_couple() to authenticated;
