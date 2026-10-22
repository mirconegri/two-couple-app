-- ---------------------------------------------------------------------------
-- Shared event editing by both partners.
-- Run with: supabase test db
-- ---------------------------------------------------------------------------

begin;
select plan(7);

-- Users A, B (in couple) ---------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'a@example.test', crypt('x', gen_salt('bf')),
   now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'b@example.test', crypt('x', gen_salt('bf')),
   now(), now(), now());

-- User A creates couple ----------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select lives_ok(
  $$ select public.create_couple('Our space') $$,
  'user A creates a couple'
);

-- Add User B to couple -----------------------------------------------------
reset role;
insert into public.couple_members (couple_id, user_id)
values ((select id from public.couples limit 1), '22222222-2222-2222-2222-222222222222');

-- User A creates a shared event --------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select lives_ok(
  $$ select public.push_event(
       '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
       'Dinner date',
       'Table at 8',
       'Restaurant',
       true,
       '2026-11-01'::date,
       '2026-11-01'::date,
       null,
       null,
       'UTC',
       'shared',
       null,
       null,
       array[60]
     ) $$,
  'user A creates shared event'
);

-- User B edits the shared event --------------------------------------------
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

select lives_ok(
  $$ select public.push_event(
       '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
       'Dinner date updated',
       'Table at 8:30',
       'Restaurant',
       true,
       '2026-11-01'::date,
       '2026-11-01'::date,
       null,
       null,
       'UTC',
       'shared',
       null,
       null,
       array[60]
     ) $$,
  'user B edits shared event created by A'
);

select is(
  (select created_by from public.events where id = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'created_by remains user A after user B edit'
);

-- User A creates a private event -------------------------------------------
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select lives_ok(
  $$ select public.push_event(
       '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
       'Secret surprise',
       'Do not peek',
       null,
       true,
       '2026-11-05'::date,
       '2026-11-05'::date,
       null,
       null,
       'UTC',
       'private',
       null,
       null,
       array[]::integer[]
     ) $$,
  'user A creates private event'
);

-- User B cannot edit User A private event ----------------------------------
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

select throws_ok(
  $$ select public.push_event(
       '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
       'Hacked',
       null,
       null,
       true,
       '2026-11-05'::date,
       '2026-11-05'::date,
       null,
       null,
       'UTC',
       'private',
       null,
       null,
       array[]::integer[]
     ) $$,
  '42501',
  'cannot modify a private event',
  'partner cannot modify private event'
);

-- User B soft deletes the shared event -------------------------------------
select lives_ok(
  $$ select public.push_event(
       '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
       'Dinner date updated',
       'Table at 8:30',
       'Restaurant',
       true,
       '2026-11-01'::date,
       '2026-11-01'::date,
       null,
       null,
       'UTC',
       'shared',
       null,
       null,
       array[60],
       now()
     ) $$,
  'user B soft-deletes shared event'
);

rollback;
