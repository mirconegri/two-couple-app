-- ---------------------------------------------------------------------------
-- 0006 — Fix invitation code generation
--
-- gen_random_bytes() and digest() live in pgcrypto, which Supabase installs
-- into the `extensions` schema. Our SECURITY DEFINER functions run with
-- `set search_path = ''`, so unqualified pgcrypto calls raise:
--   ERROR: function gen_random_bytes(integer) does not exist
--
-- Replace with pg_catalog built-ins, which are always searched first:
--   * gen_random_uuid()          — core since PostgreSQL 13
--   * sha256(bytea)              — core since PostgreSQL 11
--   * convert_to(text, encoding) — core
--
-- This removes the pgcrypto dependency entirely from the hot path.
-- ---------------------------------------------------------------------------

create or replace function public.create_invitation(p_ttl_hours integer default 48)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid          uuid := (select auth.uid());
  v_couple_id    uuid;
  v_member_count integer;
  v_code         text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select public.current_couple_id() into v_couple_id;
  if v_couple_id is null then
    raise exception 'no private space' using errcode = 'P0002';
  end if;

  select count(*) into v_member_count
  from public.couple_members
  where couple_id = v_couple_id;

  if v_member_count >= 2 then
    raise exception 'this space already has two members' using errcode = '23505';
  end if;

  -- Two concatenated UUIDs = 256 bits of entropy. Hex-encoded so the code
  -- is [0-9a-f] only: no '+' or '/' to break URLs, no '=' to trim, no
  -- characters that some messaging apps mangle.
  v_code := replace(gen_random_uuid()::text, '-', '')
         || replace(gen_random_uuid()::text, '-', '');

  insert into public.invitations (couple_id, code_hash, created_by, expires_at)
  values (
    v_couple_id,
    encode(sha256(convert_to(v_code, 'UTF8')), 'hex'),
    v_uid,
    now() + make_interval(hours => greatest(1, least(coalesce(p_ttl_hours, 48), 168)))
  );

  return v_code;
end;
$$;

revoke all on function public.create_invitation(integer) from public, anon;
grant execute on function public.create_invitation(integer) to authenticated;

-- ---------------------------------------------------------------------------

create or replace function public.redeem_invitation(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid          uuid := (select auth.uid());
  v_hash         text;
  v_inv          public.invitations%rowtype;
  v_member_count integer;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_code is null or length(btrim(p_code)) < 16 then
    -- Same error for malformed and unknown codes: do not leak existence.
    raise exception 'invalid invitation' using errcode = '22023';
  end if;

  if exists (select 1 from public.couple_members m where m.user_id = v_uid) then
    raise exception 'you already belong to a private space' using errcode = '23505';
  end if;

  v_hash := encode(sha256(convert_to(btrim(p_code), 'UTF8')), 'hex');

  select * into v_inv
  from public.invitations
  where code_hash = v_hash
  for update;

  if not found then
    raise exception 'invalid invitation' using errcode = '22023';
  end if;

  -- Serialise redemptions for this space so two codes cannot both succeed.
  perform pg_advisory_xact_lock(hashtext(v_inv.couple_id::text));

  if v_inv.used_at is not null then
    raise exception 'invitation already used' using errcode = '23505';
  end if;
  if v_inv.revoked_at is not null then
    raise exception 'invitation revoked' using errcode = '22023';
  end if;
  if v_inv.expires_at <= now() then
    raise exception 'invitation expired' using errcode = '22023';
  end if;

  select count(*) into v_member_count
  from public.couple_members
  where couple_id = v_inv.couple_id;

  if v_member_count >= 2 then
    raise exception 'this space already has two members' using errcode = '23505';
  end if;

  insert into public.couple_members (couple_id, user_id)
  values (v_inv.couple_id, v_uid);

  update public.invitations
     set used_at = now(), used_by = v_uid
   where id = v_inv.id;

  return v_inv.couple_id;
end;
$$;

revoke all on function public.redeem_invitation(text) from public, anon;
grant execute on function public.redeem_invitation(text) to authenticated;