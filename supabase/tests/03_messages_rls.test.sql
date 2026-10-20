-- ---------------------------------------------------------------------------
-- Message write path and cross-space isolation.
-- ---------------------------------------------------------------------------

begin;
select plan(7);

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
   now(), now(), now()),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'd@example.test', crypt('x', gen_salt('bf')),
   now(), now(), now());

set local role authenticated;

-- Couple 1: A + B ----------------------------------------------------------
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.create_couple('One');
create temp table inv1 as select public.create_invitation(48) as code;

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.redeem_invitation((select code from inv1));

-- Couple 2: C + D ----------------------------------------------------------
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select public.create_couple('Two');
create temp table inv2 as select public.create_invitation(48) as code;

set local request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
select public.redeem_invitation((select code from inv2));

-- A sends a message --------------------------------------------------------
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select lives_ok(
  $$ select public.push_message(
       'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
       'hello from A',
       now()
     ) $$,
  'a member can send a message'
);

-- Retrying the same id must not duplicate ---------------------------------
select lives_ok(
  $$ select public.push_message(
       'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
       'hello from A',
       now()
     ) $$,
  'retrying the same message id is accepted'
);

select is(
  (select count(*) from public.messages),
  1::bigint,
  'retrying did not create a duplicate row'
);

-- Partner can read it -----------------------------------------------------
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

select is(
  (select count(*) from public.messages),
  1::bigint,
  'the partner can read the message'
);

-- The other couple sees nothing -------------------------------------------
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

select is(
  (select count(*) from public.messages),
  0::bigint,
  'a member of another couple sees no messages'
);

-- Direct INSERT is not granted to clients ---------------------------------
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select throws_ok(
  $$ insert into public.messages (id, couple_id, sender_id, body, client_created_at)
     values ('aaaaaaaa-0000-0000-0000-000000000099'::uuid,
             public.current_couple_id(),
             '11111111-1111-1111-1111-111111111111'::uuid,
             'direct insert', now()) $$,
  '42501',
  null,
  'clients cannot INSERT into messages directly'
);

-- Sender cannot forge another sender's id ---------------------------------
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

select throws_ok(
  $$ select public.push_message(
       'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
       'tampered body',
       now()
     ) $$,
  '42501',
  null,
  'the partner cannot overwrite a message they did not send'
);

select * from finish();
rollback;
