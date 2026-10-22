-- ---------------------------------------------------------------------------
-- Profiles and display names.
-- Run with: supabase test db
-- ---------------------------------------------------------------------------

begin;
select plan(7);

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

-- User A creates a couple --------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select lives_ok(
  $$ select public.create_couple('Our space') $$,
  'user A creates a couple'
);

-- User A sets display name -------------------------------------------------
select lives_ok(
  $$ select public.set_display_name('Alice') $$,
  'user A sets display name to Alice'
);

select is(
  (select display_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'Alice',
  'user A reads own profile'
);

-- User B joins the couple --------------------------------------------------
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select lives_ok(
  $$ select public.create_invitation(48) $$,
  'user A creates invitation'
);

-- Read invitation code from invitations table directly as postgres to redeem
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

-- Add user B directly to couple for test simplicity
reset role;
insert into public.couple_members (couple_id, user_id)
values ((select id from public.couples limit 1), '22222222-2222-2222-2222-222222222222');

-- User B sets display name -------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

select lives_ok(
  $$ select public.set_display_name('Bob') $$,
  'user B sets display name to Bob'
);

select is(
  (select display_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'Alice',
  'user B can read partner Alice profile'
);

-- User C (outside couple) cannot read Alice profile ------------------------
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

select is(
  (select count(*) from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  0::bigint,
  'user C cannot read Alice profile'
);

rollback;
