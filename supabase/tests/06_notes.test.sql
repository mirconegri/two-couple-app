-- ---------------------------------------------------------------------------
-- Notes and checklists.
-- Run with: supabase test db
-- ---------------------------------------------------------------------------

begin;
select plan(8);

-- Users A, B (in couple), and C (outside) -----------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'a@example.test', crypt('x', gen_salt('bf')),
   now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'b@example.test', crypt('x', gen_salt('bf')),
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

-- Add User B directly to couple --------------------------------------------
reset role;
insert into public.couple_members (couple_id, user_id)
values ((select id from public.couples limit 1), '22222222-2222-2222-2222-222222222222');

-- User A creates a text note -----------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select lives_ok(
  $$ select public.push_note(
       'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
       'Groceries',
       'text',
       'Milk, bread, eggs',
       null,
       '#D7F0EC'
     ) $$,
  'user A creates text note'
);

-- User A creates a checklist note ------------------------------------------
select lives_ok(
  $$ select public.push_note(
       'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
       'Packing list',
       'checklist',
       null,
       '[{"id":"1","text":"Passport","checked":false}]'::jsonb,
       '#FEF0C7'
     ) $$,
  'user A creates checklist note'
);

-- User B can read both notes -----------------------------------------------
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

select is(
  (select count(*) from public.notes where deleted_at is null),
  2::bigint,
  'user B sees both notes in couple'
);

-- User B edits User A text note --------------------------------------------
select lives_ok(
  $$ select public.push_note(
       'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
       'Groceries updated',
       'text',
       'Milk, bread, eggs, cheese',
       null,
       '#D7F0EC'
     ) $$,
  'user B edits user A note'
);

select is(
  (select title from public.notes where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'Groceries updated',
  'user B edit persisted title'
);

-- User C (outside couple) cannot read notes --------------------------------
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

select is(
  (select count(*) from public.notes),
  0::bigint,
  'user C cannot read notes'
);

-- Invalid note shape fails -------------------------------------------------
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select throws_ok(
  $$ select public.push_note(
       'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
       'Invalid',
       'text',
       'some text',
       '[{"id":"1","text":"bad"}]'::jsonb,
       null
     ) $$,
  '22023',
  'text note cannot have checklist',
  'text note with checklist is rejected'
);

rollback;
