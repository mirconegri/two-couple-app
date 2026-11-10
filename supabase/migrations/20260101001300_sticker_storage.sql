-- ---------------------------------------------------------------------------
-- 0013 — Private couple-scoped sticker storage bucket & RLS policies
--
-- Custom / gallery stickers imported by a partner are uploaded to
-- `stickers/<couple_id>/<uuid>.<ext>` and referenced in messages via
-- `[sticker_storage:<couple_id>/<uuid>.<ext>]`. Both couple members can
-- upload and read stickers inside their shared couple folder.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'stickers',
  'stickers',
  false,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists stickers_select on storage.objects;
create policy stickers_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'stickers'
    and public.current_couple_id() is not null
    and (storage.foldername(name))[1] = public.current_couple_id()::text
  );

drop policy if exists stickers_insert on storage.objects;
create policy stickers_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'stickers'
    and public.current_couple_id() is not null
    and (storage.foldername(name))[1] = public.current_couple_id()::text
  );

drop policy if exists stickers_update on storage.objects;
create policy stickers_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'stickers'
    and public.current_couple_id() is not null
    and (storage.foldername(name))[1] = public.current_couple_id()::text
  )
  with check (
    bucket_id = 'stickers'
    and public.current_couple_id() is not null
    and (storage.foldername(name))[1] = public.current_couple_id()::text
  );

drop policy if exists stickers_delete on storage.objects;
create policy stickers_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'stickers'
    and public.current_couple_id() is not null
    and (storage.foldername(name))[1] = public.current_couple_id()::text
  );
