-- ---------------------------------------------------------------------------
-- 0007 — Profiles and display names
--
-- Adds a profiles table so partners can set human display names instead of
-- generic placeholders.
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or length(btrim(display_name)) between 1 and 40),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

revoke all on public.profiles from anon;
grant select on public.profiles to authenticated;

create or replace function public.shares_couple_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.couple_members m1
    join public.couple_members m2 on m1.couple_id = m2.couple_id
    where m1.user_id = (select auth.uid())
      and m2.user_id = p_user_id
  );
$$;

revoke all on function public.shares_couple_with(uuid) from public;
revoke all on function public.shares_couple_with(uuid) from anon;
grant execute on function public.shares_couple_with(uuid) to authenticated;

create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid()) or public.shares_couple_with(id)
  );

create or replace function public.set_display_name(p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_trimmed text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  v_trimmed := nullif(btrim(coalesce(p_name, '')), '');

  insert into public.profiles (id, display_name, updated_at)
  values (v_uid, v_trimmed, now())
  on conflict (id) do update
    set display_name = excluded.display_name,
        updated_at   = now();
end;
$$;

revoke all on function public.set_display_name(text) from public, anon;
grant execute on function public.set_display_name(text) to authenticated;

create or replace function public.get_couple_profiles()
returns table (user_id uuid, display_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_couple_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select public.current_couple_id() into v_couple_id;
  if v_couple_id is null then
    return;
  end if;

  return query
  select m.user_id, p.display_name
  from public.couple_members m
  left join public.profiles p on p.id = m.user_id
  where m.couple_id = v_couple_id;
end;
$$;

revoke all on function public.get_couple_profiles() from public, anon;
grant execute on function public.get_couple_profiles() to authenticated;

do $$
begin
  begin
    alter publication supabase_realtime add table public.profiles;
  exception when duplicate_object then null;
  end;
end;
$$;
