-- ---------------------------------------------------------------------------
-- Membership and authorization.
-- Run with: supabase test db
-- ---------------------------------------------------------------------------

begin;
select plan(9);

-- Two users, one couple ----------------------------------------------------
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

-- Create a space as user A -------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select lives_ok(
  $$ select public.create_couple('Our space') $$,
  'user A can create a private space'
);

select ok(
  public.current_couple_id() is not null,
  'user A now belongs to a space'
);

-- A second space must be refused ------------------------------------------
select throws_ok(
  $$ select public.create_couple('Second space') $$,
  '23505',
  null,
  'user A cannot create a second space'
);

-- User C cannot read the space --------------------------------------------
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

select is(
  (select count(*) from public.couple_members),
  0::bigint,
  'a third account sees no membership rows'
);

select is(
  (select count(*) from public.couples),
  0::bigint,
  'a third account sees no couples'
);

-- User A sees exactly their own membership --------------------------------
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select is(
  (select count(*) from public.couple_members),
  1::bigint,
  'user A sees exactly one membership row'
);

select is(
  (select count(*) from public.couples),
  1::bigint,
  'user A sees exactly one couple'
);

-- Anonymous clients must not touch anything -------------------------------
set local role anon;
set local request.jwt.claim.sub = '';

select throws_ok(
  $$ select public.create_couple('anon') $$,
  '42501',
  null,
  'anon cannot execute create_couple'
);

select throws_ok(
  $$ select public.current_couple_id() $$,
  '42501',
  null,
  'anon cannot execute current_couple_id'
);

select * from finish();
rollback;
