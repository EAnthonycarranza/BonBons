-- All fixtures roll back. This does not call SMTP or modify existing orders.
begin;
do $test$
declare
  payload jsonb; first_order jsonb; result jsonb; claimed jsonb;
  qa_order_id bigint; qa_alternate_id bigint; lease uuid; rejected boolean;
  next_tuesday date := (now() at time zone 'America/Chicago')::date + 14;
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
  perform private.bonbons_order_requests('order_notification_retry',jsonb_build_object('orderId',qa_alternate_id));
  update private.order_notifications n set attempts=5 where n.order_id=qa_alternate_id;
  claimed := private.bonbons_order_requests('order_notification_claim',jsonb_build_object('orderId',qa_alternate_id));
  result := private.bonbons_order_requests('order_notification_finish',jsonb_build_object('orderId',qa_alternate_id,'lease',claimed#>>'{0,lease}','status','retry'));
  if result->>'status'<>'failed' then raise exception 'Retries did not stop after six failed attempts'; end if;

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
end
$test$;
rollback;
select 'Incoming request, schedule, coupon and delivery assertions passed; all fixtures rolled back' as result;
