-- ---------------------------------------------------------------------------
-- Event CRUD, private-event isolation, and time-shape constraints.
-- ---------------------------------------------------------------------------

begin;
select plan(8);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'a@example.test', crypt('x', gen_salt('bf')),
   now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'b@example.test', crypt('x', gen_salt('bf')),
   now(), now(), now());

set local role authenticated;

set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.create_couple('One');
create temp table inv as select public.create_invitation(48) as code;

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.redeem_invitation((select code from inv));

-- A creates a shared all-day event ----------------------------------------
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select lives_ok(
  $$ select public.push_event(
       'eeeeeeee-0000-0000-0000-000000000001'::uuid,
       'Anniversary', null, null,
       true, '2026-03-15'::date, '2026-03-15'::date,
       null, null, null,
       'shared', null, null, '{}'::int[], null
     ) $$,
  'an all-day shared event can be created'
);

select is(
  (select starts_on from public.events
    where id = 'eeeeeeee-0000-0000-0000-000000000001'::uuid),
  '2026-03-15'::date,
  'all-day event keeps its calendar date'
);

-- A creates a private event ------------------------------------------------
select lives_ok(
  $$ select public.push_event(
       'eeeeeeee-0000-0000-0000-000000000002'::uuid,
       'Surprise plan', null, null,
       false, null, null,
       '2026-04-01T18:00:00Z'::timestamptz, '2026-04-01T20:00:00Z'::timestamptz,
       'Europe/Rome',
       'private', null, null, '{30}'::int[], null
     ) $$,
  'a private timed event can be created'
);

-- Partner sees the shared event but not the private one -------------------
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

select is(
  (select count(*) from public.events),
  1::bigint,
  'the partner sees only shared events'
);

select is(
  (select count(*) from public.events where visibility = 'private'),
  0::bigint,
  'the partner cannot see a private event'
);

-- Partner may edit a shared event -----------------------------------------
select lives_ok(
  $$ select public.push_event(
       'eeeeeeee-0000-0000-0000-000000000001'::uuid,
       'Anniversary (edited)', null, null,
       true, '2026-03-15'::date, '2026-03-16'::date,
       null, null, null,
       'shared', null, null, '{}'::int[], null
     ) $$,
  'the partner can edit a shared event'
);

-- Partner may not edit the private event ----------------------------------
select throws_ok(
  $$ select public.push_event(
       'eeeeeeee-0000-0000-0000-000000000002'::uuid,
       'Hijacked', null, null,
       false, null, null,
       '2026-04-01T18:00:00Z'::timestamptz, '2026-04-01T20:00:00Z'::timestamptz,
       'Europe/Rome', 'private', null, null, '{}'::int[], null
     ) $$,
  '42501',
  null,
  'the partner cannot modify a private event'
);

-- Malformed time shape is rejected by the CHECK constraint ----------------
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select throws_ok(
  $$ select public.push_event(
       'eeeeeeee-0000-0000-0000-000000000003'::uuid,
       'Both shapes', null, null,
       true,
       '2026-03-15'::date, '2026-03-15'::date,
       '2026-03-15T10:00:00Z'::timestamptz, '2026-03-15T11:00:00Z'::timestamptz,
       'Europe/Rome', 'shared', null, null, '{}'::int[], null
     ) $$,
  '23514',
  null,
  'an event cannot be both all-day and timed'
);

select * from finish();
rollback;
