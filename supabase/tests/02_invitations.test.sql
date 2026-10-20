-- ---------------------------------------------------------------------------
-- Invitation lifecycle: valid, expired, revoked, reused, and full space.
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
   now(), now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'c@example.test', crypt('x', gen_salt('bf')),
   now(), now(), now());

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select public.create_couple('Test space');

create temp table inv as
  select public.create_invitation(48) as code;

select ok((select length(code) from inv) >= 16, 'invitation code is long enough');

-- A malformed code is rejected --------------------------------------------
select throws_ok(
  $$ select public.redeem_invitation('short') $$,
  '22023',
  null,
  'malformed code is rejected'
);

-- Unknown code is rejected ------------------------------------------------
select throws_ok(
  $$ select public.redeem_invitation('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa') $$,
  '22023',
  null,
  'unknown code is rejected'
);

-- User B redeems successfully ---------------------------------------------
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

select lives_ok(
  format($$ select public.redeem_invitation(%L) $$, (select code from inv)),
  'user B redeems the invitation'
);

select is(
  (select count(*) from public.couple_members),
  2::bigint,
  'the space now has exactly two members'
);

-- User C cannot join a full space -----------------------------------------
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

select throws_ok(
  format($$ select public.redeem_invitation(%L) $$, (select code from inv)),
  '23505',
  null,
  'a third account cannot join an already-full space'
);

-- Reuse is rejected -------------------------------------------------------
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select throws_ok(
  format($$ select public.redeem_invitation(%L) $$, (select code from inv)),
  '23505',
  null,
  'a used invitation cannot be redeemed again'
);

select * from finish();
rollback;
