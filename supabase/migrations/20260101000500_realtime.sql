-- ---------------------------------------------------------------------------
-- 0005 — Realtime publication
--
-- Creating a table does NOT enable Realtime on it. A table must be added to
-- the `supabase_realtime` publication explicitly, otherwise postgres_changes
-- subscribers receive nothing and no error is raised anywhere.
--
-- Realtime enforces RLS as the subscribing user's role, so the policies in
-- 0003 already scope what each client may receive.
-- ---------------------------------------------------------------------------

do $$
begin
  begin
    alter publication supabase_realtime add table public.messages;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.events;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.couple_members;
  exception when duplicate_object then null;
  end;
end;
$$;

-- Under RLS the "old" record only ever carries the primary key, so the client
-- never derives conflict decisions from payload.old. Replica identity FULL is
-- still useful for non-RLS consumers and costs nothing here.
alter table public.messages replica identity full;
alter table public.events replica identity full;
