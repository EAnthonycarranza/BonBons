-- Paid invoices and PDF confirmations.
--
-- Adds a fourth customer email type. The deployed Edge Function's record_email
-- only whitelists the original three, so tracking for the new type goes through
-- public.bonbons_admin() instead — the same token-guarded path the Box of the
-- Week uses. Nothing here requires an Edge Function redeploy.

alter table public.orders
  add column if not exists paid_invoice_sent_at timestamptz;
alter table public.quotes
  add column if not exists paid_invoice_sent_at timestamptz;

-- Widen the allowed email types rather than dropping the guard entirely.
alter table public.email_events
  drop constraint if exists email_events_email_type_check;
alter table public.email_events
  add constraint email_events_email_type_check
  check (email_type = any (array[
    'request_received'::text,
    'confirmation'::text,
    'status_update'::text,
    'paid_invoice'::text
  ]));

-- record_email inside the guarded function, so a new email type can be tracked
-- without redeploying the Edge Function. Mirrors the Edge Function's behaviour:
-- log the event, then stamp the matching timestamp on the record.
create or replace function public.bonbons_record_email(
  auth_token text,
  payload jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  expected_hash constant text :=
    'ccc8ac8138efd27c19994d11d13b4e41efcc6b1273bfdfb87d39060e35ff0df5';
  record_kind text := payload ->> 'record_kind';
  email_type text := payload ->> 'email_type';
  target_id bigint;
  sent_at timestamptz := now();
  stamp_column text;
  result jsonb;
begin
  if auth_token is null
     or encode(digest(auth_token, 'sha256'), 'hex') <> expected_hash then
    raise exception 'Unauthorized.' using errcode = '28000';
  end if;

  if record_kind not in ('orders', 'quotes')
     or email_type not in ('request_received', 'confirmation', 'status_update', 'paid_invoice')
     or (email_type = 'request_received' and record_kind <> 'orders')
     or (payload ->> 'record_id') !~ '^\d+$' then
    raise exception 'Invalid email event.' using errcode = '22023';
  end if;
  target_id := (payload ->> 'record_id')::bigint;

  insert into public.email_events
    (record_kind, record_id, order_number, email_type, recipient, subject,
     provider_message_id, sent_at)
  values (
    record_kind, target_id,
    coalesce(payload ->> 'order_number', ''),
    email_type,
    lower(trim(coalesce(payload ->> 'recipient', ''))),
    left(coalesce(payload ->> 'subject', ''), 500),
    left(coalesce(payload ->> 'provider_message_id', ''), 1000),
    sent_at
  );

  stamp_column := case email_type
    when 'request_received' then 'receipt_sent_at'
    when 'confirmation' then 'confirmation_sent_at'
    when 'paid_invoice' then 'paid_invoice_sent_at'
    else 'last_update_sent_at'
  end;

  execute format(
    'update public.%I set %I = $1, updated_at = $1 where id = $2 returning to_jsonb(%I)',
    record_kind, stamp_column, record_kind
  ) into result using sent_at, target_id;

  if result is null then
    raise exception 'That record was not found.' using errcode = 'P0002';
  end if;
  return result;
end;
$fn$;

revoke all on function public.bonbons_record_email(text, jsonb) from public, authenticated;
grant execute on function public.bonbons_record_email(text, jsonb) to anon, service_role;
