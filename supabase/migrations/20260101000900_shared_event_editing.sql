-- ---------------------------------------------------------------------------
-- 0009 — Allow both partners to edit shared calendar events
--
-- If an event has visibility = 'shared', any member of the event's couple
-- can update or soft-delete it. If visibility = 'private', only the creator
-- can update or soft-delete it. The created_by column never changes.
-- ---------------------------------------------------------------------------

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
  v_uid        uuid := (select auth.uid());
  v_couple_id  uuid;
  v_existing   public.events%rowtype;
  v_created_by uuid;
  v_row        public.events;
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
    if v_existing.created_by <> v_uid and p_visibility = 'private' then
      raise exception 'cannot make a shared event private unless creator' using errcode = '42501';
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
