-- ---------------------------------------------------------------------------
-- Invitation lifecycle: valid, malformed, unknown, already-a-member, full
-- space, and reuse.
--
-- Ordering note: redeem_invitation() checks "already a member" BEFORE it
-- looks up the code, deliberately — a user who already owns a space must not
-- be able to probe which invitation codes exist. Tests that exercise the
-- code-lookup path must therefore run as a non-member.
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

-- === User A creates the space and one invitation ==========================
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select public.create_couple('Test space');

create temp table inv as
  select public.create_invitation(48) as code;

select ok(
  (select length(code) from inv) >= 16,
  'invitation code is long enough'
);

-- Malformed input is rejected by the length check, which runs before the
-- membership check.
select throws_ok(
  $$ select public.redeem_invitation('short') $$,
  '22023',
  null,
  'malformed code is rejected'
);

-- User A already belongs to a space: any redemption attempt returns 23505
-- before the code is even hashed and looked up.
select throws_ok(
  format($$ select public.redeem_invitation(%L) $$, (select code from inv)),
  '23505',
  null,
  'a user who already belongs cannot redeem any code'
);

-- === User B is not yet a member ===========================================
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

-- Only a non-member reaches the code lookup, so this is the only account
-- that can observe the "invalid invitation" path.
select throws_ok(
  $$ select public.redeem_invitation('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa') $$,
  '22023',
  null,
  'unknown code is rejected for a non-member'
);

select lives_ok(
  format($$ select public.redeem_invitation(%L) $$, (select code from inv)),
  'user B redeems the invitation'
);

select is(
  (select count(*) from public.couple_members),
  2::bigint,
  'the space now has exactly two members'
);

-- === The space is now full: no further invitations may be issued ==========
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select throws_ok(
  $$ select public.create_invitation(48) $$,
  '23505',
  null,
  'an invitation cannot be issued for a full space'
);

-- === A third account cannot use the already-redeemed code =================
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

select throws_ok(
  format($$ select public.redeem_invitation(%L) $$, (select code from inv)),
  '23505',
  null,
  'a third account cannot join a full space with a used code'
);

select * from finish();
rollback;