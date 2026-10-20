-- ---------------------------------------------------------------------------
-- 0002 — Membership helper
--
-- Why this exists: a policy on `messages` that reads `couple_members`, plus a
-- policy on `couple_members` that reads `couples`, produces
--   42P17  infinite recursion detected in policy for relation
-- and every query fails for both partners.
--
-- A SECURITY DEFINER function runs as its owner (postgres, which has
-- BYPASSRLS), so the inner read is not re-checked and the cycle is broken.
--
-- Two details are security-critical, not stylistic:
--   * `set search_path = ''` — without it a caller can shadow an unqualified
--     name with their own object and have it executed with owner privileges.
--   * fully schema-qualified identifiers inside the body.
--   * `(select auth.uid())` lets the planner cache the value per statement
--     instead of evaluating it once per row.
-- ---------------------------------------------------------------------------

create or replace function public.is_couple_member(p_couple_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.couple_members m
    where m.couple_id = p_couple_id
      and m.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_couple_member(uuid) from public;
revoke all on function public.is_couple_member(uuid) from anon;
grant execute on function public.is_couple_member(uuid) to authenticated;
