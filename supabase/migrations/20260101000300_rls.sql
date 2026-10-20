-- ---------------------------------------------------------------------------
-- 0003 — Row Level Security, grants and policies
--
-- Grants and policies are two INDEPENDENT gates:
--   * a grant decides whether a role may touch the table at all
--     (failure raises 42501 before any policy runs)
--   * a policy decides which rows that operation applies to
--
-- Adding a policy never revokes an existing grant. New tables in `public`
-- can arrive with SELECT/INSERT/UPDATE/DELETE already granted to `anon`,
-- so every table below is explicitly revoked first.
--
-- Writes to messages/events are intentionally NOT granted to clients:
-- they go through SECURITY DEFINER RPCs that validate membership and
-- sender identity themselves. Clients only ever need SELECT.
-- ---------------------------------------------------------------------------

-- Enable RLS ---------------------------------------------------------------

alter table public.couples         enable row level security;
alter table public.couple_members  enable row level security;
alter table public.invitations     enable row level security;
alter table public.messages        enable row level security;
alter table public.events          enable row level security;
alter table public.push_tokens     enable row level security;

-- Revoke everything from anonymous clients --------------------------------

revoke all on public.couples        from anon;
revoke all on public.couple_members from anon;
revoke all on public.invitations    from anon;
revoke all on public.messages       from anon;
revoke all on public.events         from anon;
revoke all on public.push_tokens    from anon;

-- Grant the minimum the signed-in app needs -------------------------------

revoke all on public.couples        from authenticated;
revoke all on public.couple_members from authenticated;
revoke all on public.invitations    from authenticated;
revoke all on public.messages       from authenticated;
revoke all on public.events         from authenticated;
revoke all on public.push_tokens    from authenticated;

grant select on public.couples        to authenticated;
grant select on public.couple_members to authenticated;
grant select on public.invitations    to authenticated;
grant select on public.messages       to authenticated;
grant select on public.events         to authenticated;
grant select, insert, update, delete on public.push_tokens to authenticated;

-- Policies -----------------------------------------------------------------
-- One policy per operation; `to authenticated` stops `anon` at the role check.

-- couples ------------------------------------------------------------------
create policy couples_select on public.couples
  for select to authenticated
  using (public.is_couple_member(id));

-- couple_members -----------------------------------------------------------
create policy couple_members_select on public.couple_members
  for select to authenticated
  using (public.is_couple_member(couple_id));

-- invitations --------------------------------------------------------------
-- Only the creator sees their own invitations; raw codes are never stored.
create policy invitations_select on public.invitations
  for select to authenticated
  using (
    public.is_couple_member(couple_id)
    and created_by = (select auth.uid())
  );

-- messages -----------------------------------------------------------------
-- Tombstones must stay visible so deletions propagate to offline devices,
-- so the policy deliberately does not filter on deleted_at.
create policy messages_select on public.messages
  for select to authenticated
  using (public.is_couple_member(couple_id));

-- events -------------------------------------------------------------------
-- Private events are hidden from the partner by the *database*, not the UI.
create policy events_select on public.events
  for select to authenticated
  using (
    public.is_couple_member(couple_id)
    and (visibility = 'shared' or created_by = (select auth.uid()))
  );

-- push_tokens --------------------------------------------------------------
create policy push_tokens_select on public.push_tokens
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy push_tokens_insert on public.push_tokens
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_couple_member(couple_id)
  );

create policy push_tokens_update on public.push_tokens
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and public.is_couple_member(couple_id)
  );

create policy push_tokens_delete on public.push_tokens
  for delete to authenticated
  using (user_id = (select auth.uid()));
