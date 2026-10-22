-- ---------------------------------------------------------------------------
-- Push failures table and RLS.
-- Run with: supabase test db
-- ---------------------------------------------------------------------------

begin;
select plan(4);

-- Users A (in couple) and C (outside) ---------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'a@example.test', crypt('x', gen_salt('bf')),
   now(), now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'c@example.test', crypt('x', gen_salt('bf')),
   now(), now(), now());

-- User A creates couple ----------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select lives_ok(
  $$ select public.create_couple('Our space') $$,
  'user A creates a couple'
);

-- Edge function / Service role inserts a push failure ----------------------
reset role;

insert into public.push_failures (user_id, couple_id, error, details)
values (
  '11111111-1111-1111-1111-111111111111',
  (select id from public.couples limit 1),
  'SenderIdMismatch',
  '{"message": "FCM mismatch"}'::jsonb
);

-- User A can view push failures for their couple ---------------------------
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select is(
  (select count(*) from public.push_failures),
  1::bigint,
  'user A can read push failures in their couple'
);

-- User C (outside couple) cannot view push failures ------------------------
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

select is(
  (select count(*) from public.push_failures),
  0::bigint,
  'user C cannot read push failures of other couples'
);

-- Anon has no access -------------------------------------------------------
set local role anon;

select throws_ok(
  $$ select count(*) from public.push_failures $$,
  '42501',
  'permission denied for table push_failures',
  'anon cannot access push_failures'
);

rollback;
