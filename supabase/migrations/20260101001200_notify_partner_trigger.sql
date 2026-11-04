-- -----------------------------------------------------------------------------
-- 20260101001200_notify_partner_trigger.sql
--
-- Automatically triggers notify-partner Edge Function via pg_net on message INSERT.
-- -----------------------------------------------------------------------------

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_partner_on_message()
returns trigger
language plpgsql
security definer
as $$
declare
  v_url text;
begin
  -- Only trigger for actual messages (not soft-deleted rows)
  if NEW.deleted_at is null then
    v_url := 'https://arilfasmvhlyhkjjfxds.supabase.co/functions/v1/notify-partner';

    perform net.http_post(
      url := v_url,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := json_build_object(
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'record', row_to_json(NEW)
      )::jsonb
    );
  end if;

  return NEW;
end;
$$;

drop trigger if exists tr_notify_partner_on_message on public.messages;
create trigger tr_notify_partner_on_message
after insert on public.messages
for each row
execute function public.notify_partner_on_message();
