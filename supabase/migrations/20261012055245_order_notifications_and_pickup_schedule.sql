alter table public.orders
  add column wanted_time text not null default '' check (wanted_time='' or wanted_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  add column pickup_request_type text not null default 'regular' check (pickup_request_type in ('regular','custom')),
  add column customer_request_id uuid unique,
  add column request_fingerprint text,
  add column request_notification_status text not null default '' check (request_notification_status in ('','pending','sending','sent','failed','needs_review')),
  add column request_notification_sent_at timestamptz,
  add column request_notification_error text not null default '';
create table private.order_notifications (
  order_id bigint primary key references public.orders(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed','needs_review')),
  attempts integer not null default 0, next_attempt_at timestamptz not null default now(),
  lease uuid, lease_until timestamptz, message_id text not null default '', last_error text not null default ''
);
alter table private.order_notifications enable row level security;
revoke all on private.order_notifications from public,anon,authenticated,service_role;
create or replace function private.enqueue_incoming_order()
returns trigger language plpgsql security definer set search_path='' as $fn$
begin
  if new.customer_request_id is not null and new.wanted_time<>'' then
    insert into private.order_notifications(order_id) values(new.id) on conflict do nothing;
    if found then update public.orders set request_notification_status='pending' where id=new.id; end if;
  end if;
  return new;
end;
$fn$;
revoke all on function private.enqueue_incoming_order() from public,anon,authenticated,service_role;
create trigger enqueue_incoming_order after insert or update of wanted_time on public.orders
for each row execute function private.enqueue_incoming_order();

create or replace function private.bonbons_order_requests(action text,payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare
  p jsonb; result jsonb; request_key uuid; fingerprint text;
  saved public.orders%rowtype; job private.order_notifications%rowtype;
  requested_date date; requested_time time; request_kind text; requested_at timestamptz;
begin
  if action='order_submit' then
    p=payload->'order'; request_key=(payload->>'request_id')::uuid;
    if request_key is null or jsonb_typeof(p)<>'object' then raise exception 'Reload checkout before sending your request.' using errcode='22023'; end if;
    fingerprint=encode(extensions.digest(jsonb_build_object('order',p,'coupon',coalesce(payload->>'code',''),'payment',coalesce(payload->>'payment_choice','online'))::text,'sha256'),'hex');
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(request_key::text,0));
    select * into saved from public.orders where customer_request_id=request_key;
    if found then
      if saved.request_fingerprint is distinct from fingerprint then raise exception 'This request has already been received with different details. Review it before submitting again.' using errcode='23505'; end if;
      return jsonb_build_object('data',to_jsonb(saved),'replayed',true);
    end if;
    requested_date=(p->>'wanted_date')::date;
    if coalesce(p->>'wanted_time','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Choose a valid pickup time.' using errcode='22023'; end if;
    requested_time=(p->>'wanted_time')::time;
    request_kind=coalesce(p->>'pickup_request_type','regular');
    requested_at=(requested_date+requested_time) at time zone 'America/Chicago';
    if requested_at is null or requested_at<=now() or request_kind not in ('regular','custom') then raise exception 'Choose a future date and time in San Antonio time.' using errcode='22023'; end if;
    if request_kind='regular' and (extract(dow from requested_date) not in (2,4,5) or requested_time<'15:00'::time or requested_time>'20:00'::time or extract(minute from requested_time) not in (0,30)) then
      raise exception 'Regular pickup is Tuesday, Thursday, or Friday, 3–8 p.m. Choose a regular slot or request another time.' using errcode='22023';
    end if;
    if coalesce(payload->>'code','')<>'' then
      result=private.bonbons_coupons('coupon_order',jsonb_build_object('code',payload->>'code','request_id',request_key,'order',p,'payment_choice',payload->>'payment_choice'));
      if (result->>'replayed')::boolean then raise exception 'This request has already been received. Review it before submitting again.' using errcode='23505'; end if;
      update public.orders set wanted_time=p->>'wanted_time',pickup_request_type=request_kind,customer_request_id=request_key,request_fingerprint=fingerprint where id=(result->'data'->>'id')::bigint;
      select * into saved from public.orders where id=(result->'data'->>'id')::bigint;
    else
      insert into public.orders(items,subtotal,customer_name,customer_email,customer_phone,fulfilment,wanted_date,wanted_time,pickup_request_type,notes,payment_status,customer_request_id,request_fingerprint)
      values(p->'items',(p->>'subtotal')::numeric,p->>'customer_name',p->>'customer_email',p->>'customer_phone','Pickup',requested_date,p->>'wanted_time',request_kind,coalesce(p->>'notes',''),case when payload->>'payment_choice'='cash' then 'cash_at_pickup' else 'not_arranged' end,request_key,fingerprint)
      returning * into saved;
      -- The AFTER INSERT trigger records the pending notification atomically.
      select * into saved from public.orders where id=saved.id;
    end if;
    return jsonb_build_object('data',to_jsonb(saved),'replayed',false);
  end if;
  if action='order_notification_claim' then
    -- An expired lease has an uncertain delivery outcome. Never resend it automatically.
    update private.order_notifications set status='needs_review',last_error='Delivery was interrupted. Check the inbox before retrying.' where status='sending' and lease_until<now();
    update public.orders o set request_notification_status='needs_review',request_notification_error=n.last_error from private.order_notifications n where n.order_id=o.id and n.status='needs_review' and o.request_notification_status='sending';
    select * into job from private.order_notifications where status='pending' and next_attempt_at<=now() and (payload->>'orderId' is null or order_id=(payload->>'orderId')::bigint) order by next_attempt_at,order_id for update skip locked limit 1;
    if not found then return '[]'::jsonb; end if;
    update private.order_notifications set status='sending',attempts=attempts+1,lease=pg_catalog.gen_random_uuid(),lease_until=now()+interval '3 minutes' where order_id=job.order_id returning * into job;
    update public.orders set request_notification_status='sending' where id=job.order_id;
    select * into saved from public.orders where id=job.order_id;
    return jsonb_build_array(jsonb_build_object('order',to_jsonb(saved),'lease',job.lease));
  end if;
  if action='order_notification_finish' then
    select * into job from private.order_notifications where order_id=(payload->>'orderId')::bigint for update;
    if not found or job.status<>'sending' or job.lease is distinct from (payload->>'lease')::uuid then raise exception 'This delivery attempt has changed.' using errcode='40001'; end if;
    if payload->>'status' not in ('sent','retry','needs_review') then raise exception 'Choose a valid delivery result.' using errcode='22023'; end if;
    update private.order_notifications set
      status=case when payload->>'status'='retry' then case when attempts>=6 then 'failed' else 'pending' end else payload->>'status' end,
      next_attempt_at=now()+make_interval(secs=>least(3600,60*power(2,attempts-1))::integer),
      message_id=left(coalesce(payload->>'messageId',''),1000),last_error=left(coalesce(payload->>'error',''),500),lease_until=null
    where order_id=job.order_id returning * into job;
    update public.orders set request_notification_status=job.status,request_notification_sent_at=case when job.status='sent' then now() else request_notification_sent_at end,request_notification_error=job.last_error where id=job.order_id;
    return jsonb_build_object('status',job.status);
  end if;
  if action='order_notification_retry' then
    select * into job from private.order_notifications where order_id=(payload->>'orderId')::bigint for update;
    if not found then raise exception 'No incoming notification exists for this order.' using errcode='P0002'; end if;
    if job.status in ('sent','sending') then raise exception 'This notification is already sent or in progress.' using errcode='22023'; end if;
    update private.order_notifications set status='pending',attempts=0,next_attempt_at=now(),last_error='' where order_id=job.order_id;
    update public.orders set request_notification_status='pending',request_notification_error='' where id=job.order_id;
    return jsonb_build_object('queued',true);
  end if;
  if action='order_notification_order' then
    select * into saved from public.orders where id=(payload->>'orderId')::bigint;
    if not found then raise exception 'Order not found.' using errcode='P0002'; end if;
    return to_jsonb(saved);
  end if;
  raise exception 'Unknown incoming order action.' using errcode='22023';
end;
$fn$;
revoke all on function private.bonbons_order_requests(text,jsonb) from public,anon,authenticated,service_role;
create or replace function public.bonbons_admin(auth_token text,action text,payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $fn$
begin
  perform private.bonbons_admin_legacy(auth_token,'get_shop_settings','{}'::jsonb);
  if action in ('order_submit','order_notification_claim','order_notification_finish','order_notification_retry','order_notification_order') then return private.bonbons_order_requests(action,payload); end if;
  if action in ('page_list','page_save','page_publish','menu_create','menu_update','update_treat_settings') then return private.bonbons_catalog_pages(action,payload); end if;
  return private.bonbons_admin_legacy(auth_token,action,payload);
end;
$fn$;
revoke all on function public.bonbons_admin(text,text,jsonb) from public,authenticated;
grant execute on function public.bonbons_admin(text,text,jsonb) to anon,service_role;
do $test$
declare
  payload jsonb; first_order jsonb; result jsonb; claimed jsonb;
  qa_order_id bigint; qa_alternate_id bigint; lease uuid; rejected boolean;
  next_tuesday date := (now() at time zone 'America/Chicago')::date + 14;
begin
  begin
  while extract(dow from next_tuesday) <> 2 loop next_tuesday := next_tuesday + 1; end loop;
  payload := jsonb_build_object('request_id',gen_random_uuid(),'code','','payment_choice','cash','order',
    jsonb_build_object('items','[{"key":"qa","name":"Rollback treat","qty":1,"price":3}]'::jsonb,
      'subtotal',3,'customer_name','QA rollback','customer_email','notification-qa@example.invalid',
      'customer_phone','2105550100','wanted_date',next_tuesday,'wanted_time','15:00',
      'pickup_request_type','regular','notes','Rollback only'));
  first_order := private.bonbons_order_requests('order_submit',payload);
  qa_order_id := (first_order#>>'{data,id}')::bigint;
  if first_order#>>'{data,wanted_time}'<>'15:00' or first_order#>>'{data,payment_status}'<>'cash_at_pickup'
    or first_order#>>'{data,request_notification_status}'<>'pending' then raise exception 'Pickup or notification was not saved atomically'; end if;
  if not exists(select 1 from private.order_notifications n where n.order_id=qa_order_id and n.status='pending') then raise exception 'Notification missing'; end if;
  result := private.bonbons_order_requests('order_submit',payload);
  if (result->>'replayed')::boolean is not true or result#>>'{data,id}'<>qa_order_id::text then raise exception 'Replay created another order'; end if;
  if (select count(*) from public.orders where customer_request_id=(payload->>'request_id')::uuid)<>1 then raise exception 'Duplicate request'; end if;
  rejected := false;
  begin perform private.bonbons_order_requests('order_submit',jsonb_set(payload,'{order,notes}','"changed"')); exception when sqlstate '23505' then rejected:=true; end;
  if not rejected then raise exception 'Conflicting replay allowed'; end if;

  payload := jsonb_set(payload,'{request_id}',to_jsonb(gen_random_uuid()));
  rejected := false;
  begin perform private.bonbons_order_requests('order_submit',jsonb_set(payload,'{order,wanted_date}',to_jsonb(next_tuesday+1))); exception when sqlstate '22023' then rejected:=true; end;
  if not rejected then raise exception 'Wednesday regular pickup allowed'; end if;
  rejected := false;
  begin perform private.bonbons_order_requests('order_submit',jsonb_set(payload,'{order,wanted_time}','"20:30"')); exception when sqlstate '22023' then rejected:=true; end;
  if not rejected then raise exception 'Outside regular hours allowed'; end if;
  rejected := false;
  begin perform private.bonbons_order_requests('order_submit',jsonb_set(payload,'{order,wanted_date}',to_jsonb(next_tuesday-365))); exception when sqlstate '22023' then rejected:=true; end;
  if not rejected then raise exception 'Past pickup allowed'; end if;
  payload := jsonb_set(jsonb_set(jsonb_set(payload,'{order,wanted_date}',to_jsonb(next_tuesday+1)),'{order,wanted_time}','"10:17"'),'{order,pickup_request_type}','"custom"');
  result := private.bonbons_order_requests('order_submit',payload);
  qa_alternate_id := (result#>>'{data,id}')::bigint;
  if result#>>'{data,pickup_request_type}'<>'custom' or result#>>'{data,wanted_time}'<>'10:17'
    or result#>>'{data,status}'<>'pending' then raise exception 'Alternate pickup was not saved as a request'; end if;

  claimed := private.bonbons_order_requests('order_notification_claim',jsonb_build_object('orderId',qa_order_id));
  lease := (claimed#>>'{0,lease}')::uuid;
  if jsonb_array_length(claimed)<>1 or claimed#>>'{0,order,request_notification_status}'<>'sending' then raise exception 'Claim did not lock delivery'; end if;
  result := private.bonbons_order_requests('order_notification_claim',jsonb_build_object('orderId',qa_order_id));
  if jsonb_array_length(result)<>0 then raise exception 'A second worker claimed the same order'; end if;
  rejected := false;
  begin perform private.bonbons_order_requests('order_notification_finish',jsonb_build_object('orderId',qa_order_id,'lease',gen_random_uuid(),'status','sent')); exception when sqlstate '40001' then rejected:=true; end;
  if not rejected then raise exception 'Wrong lease recorded a result'; end if;
  result := private.bonbons_order_requests('order_notification_finish',jsonb_build_object('orderId',qa_order_id,'lease',lease,'status','retry','error','QA rejected'));
  if result->>'status'<>'pending' or not exists(select 1 from private.order_notifications n where n.order_id=qa_order_id and n.next_attempt_at>now() and n.attempts=1) then raise exception 'Retry did not back off'; end if;
  result := private.bonbons_order_requests('order_notification_claim',jsonb_build_object('orderId',qa_order_id));
  if jsonb_array_length(result)<>0 then raise exception 'Retry backoff ignored'; end if;
  perform private.bonbons_order_requests('order_notification_retry',jsonb_build_object('orderId',qa_order_id));
  claimed := private.bonbons_order_requests('order_notification_claim',jsonb_build_object('orderId',qa_order_id));
  result := private.bonbons_order_requests('order_notification_finish',jsonb_build_object('orderId',qa_order_id,'lease',claimed#>>'{0,lease}','status','sent','messageId','QA no SMTP'));
  if result->>'status'<>'sent' or not exists(select 1 from public.orders o where o.id=qa_order_id and o.request_notification_sent_at is not null) then raise exception 'Acceptance was not recorded'; end if;
  rejected := false;
  begin perform private.bonbons_order_requests('order_notification_retry',jsonb_build_object('orderId',qa_order_id)); exception when sqlstate '22023' then rejected:=true; end;
  if not rejected then raise exception 'Accepted notification was queued again'; end if;

  claimed := private.bonbons_order_requests('order_notification_claim',jsonb_build_object('orderId',qa_alternate_id));
  update private.order_notifications n set lease_until=now()-interval '1 second' where n.order_id=qa_alternate_id;
  result := private.bonbons_order_requests('order_notification_claim',jsonb_build_object('orderId',qa_alternate_id));
  if jsonb_array_length(result)<>0 or not exists(select 1 from public.orders o where o.id=qa_alternate_id and o.request_notification_status='needs_review') then raise exception 'Interrupted delivery was automatically resent'; end if;

  -- Coupon redemption and its notification must commit as one request too.
  perform private.bonbons_coupons('coupon_create','{"codes":["QA-INCOMING-ORDER"],"name":"QA incoming rollback","discount_amount":1}'::jsonb);
  payload := jsonb_set(jsonb_set(payload,'{request_id}',to_jsonb(gen_random_uuid())),'{code}','"QA-INCOMING-ORDER"');
  first_order := private.bonbons_order_requests('order_submit',payload);
  qa_order_id := (first_order#>>'{data,id}')::bigint;
  if (first_order#>>'{data,subtotal}')::numeric<>2 or first_order#>>'{data,wanted_time}'<>'10:17'
    or first_order#>>'{data,request_notification_status}'<>'pending' then raise exception 'Coupon request lost pickup or notification'; end if;
  result := private.bonbons_order_requests('order_submit',payload);
  if (result->>'replayed')::boolean is not true or (select redemption_count from public.coupons where code='QA-INCOMING-ORDER')<>1 then raise exception 'Coupon replay used another redemption'; end if;
  if has_function_privilege('anon','private.bonbons_order_requests(text,jsonb)','EXECUTE')
    or has_table_privilege('anon','private.order_notifications','SELECT') then raise exception 'Queue helper publicly accessible'; end if;
  rejected := false;
  begin perform public.bonbons_admin('invalid-token','order_submit',payload); exception when sqlstate '28000' then rejected:=true; end;
  if not rejected then raise exception 'Public token guard bypassed'; end if;
  raise exception 'Rollback assertion fixtures' using errcode='P9999';
  exception when sqlstate 'P9999' then null;
  end;
end
$test$;
