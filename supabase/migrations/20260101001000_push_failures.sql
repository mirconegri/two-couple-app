-- ---------------------------------------------------------------------------
-- 0010 — Push Failures
--
-- Audit table for push notification errors from notify-partner edge function.
-- ---------------------------------------------------------------------------

create table if not exists public.push_failures (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  couple_id  uuid references public.couples(id) on delete cascade,
  error      text not null,
  details    jsonb,
  created_at timestamptz not null default now()
);

alter table public.push_failures enable row level security;

revoke all on public.push_failures from anon;
grant select on public.push_failures to authenticated;

create policy push_failures_select on public.push_failures
  for select to authenticated
  using (public.is_couple_member(couple_id));
