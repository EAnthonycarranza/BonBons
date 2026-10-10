-- Run against a database with the coupon migration. Every fixture rolls back;
-- no customer email is sent. Assertion failures abort the transaction.
begin;
do $test$
declare
  result jsonb;
  first_order jsonb;
  payload jsonb;
  rejected boolean;
  uses integer;
begin
  perform private.bonbons_coupons('coupon_create', '{"codes":["QA-COUPON-ONCE"],"name":"QA once","discount_amount":1}'::jsonb);
  result := private.bonbons_coupons('coupon_preview', '{"code":"qa-coupon-once","subtotal":4}'::jsonb);
  if (result->>'subtotal')::numeric <> 3 then raise exception 'Preview total assertion failed'; end if;
  select redemption_count into uses from public.coupons where code='QA-COUPON-ONCE';
  if uses <> 0 then raise exception 'Preview consumed a use'; end if;
  payload := jsonb_build_object('code','QA-COUPON-ONCE', 'request_id','edc49324-b214-4da7-8a29-2a55df567700', 'payment_choice','cash', 'order',
    '{"items":[{"key":"qa","name":"QA item","qty":1,"price":4}],"subtotal":4,"customer_name":"QA rollback","customer_email":"qa@example.invalid","customer_phone":"2105550100","wanted_date":"2026-12-01","notes":""}'::jsonb);
  first_order := private.bonbons_coupons('coupon_order', payload);
  if (first_order#>>'{data,subtotal}')::numeric <> 3 or first_order#>>'{data,payment_status}' <> 'cash_at_pickup' then raise exception 'Saved totals or cash choice assertion failed'; end if;
  result := private.bonbons_coupons('coupon_order', payload);
  if (result->>'replayed')::boolean is not true or result#>>'{data,id}' <> first_order#>>'{data,id}' then raise exception 'Idempotency assertion failed'; end if;
  select redemption_count into uses from public.coupons where code='QA-COUPON-ONCE';
  if uses <> 1 then raise exception 'Retry consumed another use'; end if;
  rejected := false;
  begin perform private.bonbons_coupons('coupon_order', jsonb_set(payload,'{order,notes}','"changed"')); exception when sqlstate '22023' then rejected := true; end;
  if not rejected then raise exception 'Changed request replayed'; end if;
  rejected := false;
  begin perform private.bonbons_coupons('coupon_order', jsonb_set(payload,'{request_id}','"edc49324-b214-4da7-8a29-2a55df567701"')); exception when sqlstate '22023' then rejected := true; end;
  if not rejected then raise exception 'Single-use coupon redeemed twice'; end if;

  -- A different code from the same promotion cannot bypass the email limit,
  -- even after its original order is deleted. Campaign names ignore case/spaces.
  perform private.bonbons_coupons('coupon_create', '{"codes":["QA-COUPON-SAME-PROMO"],"name":"  qa   ONCE  ","discount_amount":1}'::jsonb);
  delete from public.orders where id = (first_order#>>'{data,id}')::bigint;
  rejected := false;
  begin perform private.bonbons_coupons('coupon_order', jsonb_set(jsonb_set(payload,'{code}','"QA-COUPON-SAME-PROMO"'),'{request_id}','"edc49324-b214-4da7-8a29-2a55df567706"')); exception when sqlstate '22023' then rejected := true; end;
  if not rejected then raise exception 'Customer limit bypassed across codes or by deleting an order'; end if;
  select redemption_count into uses from public.coupons where code='QA-COUPON-SAME-PROMO';
  if uses <> 0 then raise exception 'Rejected customer consumed another code'; end if;

  perform private.bonbons_coupons('coupon_create', '{"codes":["QA-COUPON-SHARED"],"name":"QA shared","discount_amount":1,"max_redemptions":2}'::jsonb);
  payload := jsonb_set(jsonb_set(payload,'{code}','"QA-COUPON-SHARED"'),'{order,customer_email}','"qa-shared-1@example.invalid"');
  perform private.bonbons_coupons('coupon_order', jsonb_set(payload,'{request_id}','"edc49324-b214-4da7-8a29-2a55df567702"'));
  payload := jsonb_set(payload,'{order,customer_email}','"qa-shared-2@example.invalid"');
  perform private.bonbons_coupons('coupon_order', jsonb_set(payload,'{request_id}','"edc49324-b214-4da7-8a29-2a55df567703"'));
  payload := jsonb_set(payload,'{order,customer_email}','"qa-shared-3@example.invalid"');
  rejected := false;
  begin perform private.bonbons_coupons('coupon_order', jsonb_set(payload,'{request_id}','"edc49324-b214-4da7-8a29-2a55df567704"')); exception when sqlstate '22023' then rejected := true; end;
  if not rejected then raise exception 'Shared limit was exceeded'; end if;

  perform private.bonbons_coupons('coupon_create', '{"codes":["QA-COUPON-TERMS"],"name":"QA terms","discount_amount":10,"minimum_subtotal":5}'::jsonb);
  rejected := false;
  begin perform private.bonbons_coupons('coupon_preview', '{"code":"QA-COUPON-TERMS","subtotal":4}'::jsonb); exception when sqlstate '22023' then rejected := true; end;
  if not rejected then raise exception 'Minimum order bypassed'; end if;
  result := private.bonbons_coupons('coupon_preview', '{"code":"QA-COUPON-TERMS","subtotal":5}'::jsonb);
  if (result->>'subtotal')::numeric <> 0 or (result->>'discountAmount')::numeric <> 5 then raise exception 'Discount was not capped at total'; end if;
  perform private.bonbons_coupons('coupon_update', jsonb_build_object('id',(select id from public.coupons where code='QA-COUPON-TERMS'),'active',false));
  rejected := false;
  begin perform private.bonbons_coupons('coupon_preview', '{"code":"QA-COUPON-TERMS","subtotal":5}'::jsonb); exception when sqlstate '22023' then rejected := true; end;
  if not rejected then raise exception 'Disabled coupon accepted'; end if;
  update public.coupons set active=true, expires_on=(now() at time zone 'America/Chicago')::date - 1 where code='QA-COUPON-TERMS';
  rejected := false;
  begin perform private.bonbons_coupons('coupon_preview', '{"code":"QA-COUPON-TERMS","subtotal":5}'::jsonb); exception when sqlstate '22023' then rejected := true; end;
  if not rejected then raise exception 'Expired coupon accepted'; end if;
  update public.coupons set expires_on=(now() at time zone 'America/Chicago')::date where code='QA-COUPON-TERMS';
  perform private.bonbons_coupons('coupon_preview', '{"code":"QA-COUPON-TERMS","subtotal":5}'::jsonb);

  perform private.bonbons_coupons('coupon_create', '{"codes":["QA-COUPON-FAILURE"],"name":"QA failure","discount_amount":1}'::jsonb);
  payload := jsonb_set(jsonb_set(payload,'{code}','"QA-COUPON-FAILURE"'),'{order,items}','null');
  rejected := false;
  begin perform private.bonbons_coupons('coupon_order', jsonb_set(payload,'{request_id}','"edc49324-b214-4da7-8a29-2a55df567705"')); exception when sqlstate '23514' or sqlstate '23502' then rejected := true; end;
  if not rejected then raise exception 'Invalid order accepted'; end if;
  select redemption_count into uses from public.coupons where code='QA-COUPON-FAILURE';
  if uses <> 0 then raise exception 'Failed save consumed a use'; end if;
  -- Online, staff and customer physical redemptions share both limits.
  perform private.bonbons_coupons('coupon_create', '{"codes":["QA-PHYSICAL-ONCE"],"name":"QA physical once","discount_amount":1}'::jsonb);
  payload := '{"code":"QA-PHYSICAL-ONCE","customer_email":"Physical@Example.invalid","customer_name":"QA rollback","subtotal":4,"channel":"admin","request_id":"edc49324-b214-4da7-8a29-2a55df567710"}'::jsonb;
  result := private.bonbons_coupon_redemption('coupon_redeem',payload);
  if (result->>'discountAmount')::numeric<>1 or (result->>'subtotal')::numeric<>3 then raise exception 'Physical totals failed'; end if;
  result := private.bonbons_coupon_redemption('coupon_redeem',payload);
  if (result->>'replayed')::boolean is not true then raise exception 'Physical retry failed'; end if;
  select redemption_count into uses from public.coupons where code='QA-PHYSICAL-ONCE';
  if uses<>1 then raise exception 'Physical retry consumed twice'; end if;
  rejected := false;
  begin perform private.bonbons_coupon_redemption('coupon_redeem',jsonb_set(payload,'{subtotal}','5')); exception when sqlstate '22023' then rejected:=true; end;
  if not rejected then raise exception 'Changed physical request replayed'; end if;
  rejected := false;
  begin perform private.bonbons_coupon_redemption('coupon_redeem',jsonb_set(jsonb_set(payload,'{request_id}','"edc49324-b214-4da7-8a29-2a55df567711"'),'{channel}','"customer"')); exception when sqlstate '22023' then rejected:=true; end;
  if not rejected then raise exception 'Physical coupon reused by customer'; end if;
  rejected := false;
  begin perform private.bonbons_coupons('coupon_order',jsonb_build_object('code','QA-PHYSICAL-ONCE','request_id',gen_random_uuid(),'order',
    '{"items":[{"key":"qa","name":"QA item","qty":1,"price":4}],"subtotal":4,"customer_name":"QA rollback","customer_email":"online-after@example.invalid","customer_phone":"2105550100","wanted_date":"2026-12-01","notes":""}'::jsonb)); exception when sqlstate '22023' then rejected:=true; end;
  if not rejected then raise exception 'Physical redemption reused online'; end if;
  -- The earlier online redemption cannot be used physically either.
  rejected := false;
  begin perform private.bonbons_coupon_redemption('coupon_redeem',jsonb_set(jsonb_set(payload,'{code}','"QA-COUPON-ONCE"'),'{request_id}','"edc49324-b214-4da7-8a29-2a55df567712"')); exception when sqlstate '22023' then rejected:=true; end;
  if not rejected then raise exception 'Online redemption reused physically'; end if;

  perform private.bonbons_coupons('coupon_create', '{"codes":["QA-PHYSICAL-SHARED","QA-PHYSICAL-PROMO"],"name":"QA physical shared","discount_amount":1,"max_redemptions":2}'::jsonb);
  payload:=jsonb_set(jsonb_set(payload,'{code}','"QA-PHYSICAL-SHARED"'),'{request_id}','"edc49324-b214-4da7-8a29-2a55df567713"');
  perform private.bonbons_coupon_redemption('coupon_redeem',payload);
  rejected:=false;
  begin perform private.bonbons_coupon_redemption('coupon_redeem',jsonb_set(jsonb_set(jsonb_set(payload,'{code}','"QA-PHYSICAL-PROMO"'),'{request_id}','"edc49324-b214-4da7-8a29-2a55df567714"'),'{channel}','"customer"')); exception when sqlstate '22023' then rejected:=true; end;
  if not rejected then raise exception 'Physical customer used another code from same promotion'; end if;
  select redemption_count into uses from public.coupons where code='QA-PHYSICAL-PROMO';
  if uses<>0 then raise exception 'Rejected promotion duplicate consumed a use'; end if;
  perform private.bonbons_coupons('coupon_order',jsonb_build_object('code','QA-PHYSICAL-SHARED','request_id',gen_random_uuid(),'order',
    '{"items":[{"key":"qa","name":"QA item","qty":1,"price":4}],"subtotal":4,"customer_name":"QA rollback","customer_email":"shared-online@example.invalid","customer_phone":"2105550100","wanted_date":"2026-12-01","notes":""}'::jsonb));
  rejected:=false;
  begin perform private.bonbons_coupon_redemption('coupon_redeem',jsonb_set(jsonb_set(payload,'{customer_email}','"third@example.invalid"'),'{request_id}','"edc49324-b214-4da7-8a29-2a55df567715"')); exception when sqlstate '22023' then rejected:=true; end;
  if not rejected then raise exception 'Mixed channel shared limit exceeded'; end if;

  perform private.bonbons_coupons('coupon_create', '{"codes":["QA-PHYSICAL-MINIMUM"],"name":"QA physical minimum","discount_amount":10,"minimum_subtotal":5}'::jsonb);
  payload:=jsonb_set(jsonb_set(payload,'{code}','"QA-PHYSICAL-MINIMUM"'),'{request_id}','"edc49324-b214-4da7-8a29-2a55df567716"');
  rejected:=false;
  begin perform private.bonbons_coupon_redemption('coupon_redeem',payload); exception when sqlstate '22023' then rejected:=true; end;
  if not rejected then raise exception 'Physical minimum bypassed'; end if;
  result:=private.bonbons_coupon_redemption('coupon_redeem',jsonb_set(payload,'{subtotal}','5'));
  if (result->>'subtotal')::numeric<>0 or (result->>'discountAmount')::numeric<>5 then raise exception 'Physical clamp failed'; end if;
  if jsonb_array_length(private.bonbons_coupon_redemption('coupon_redemptions','{}'::jsonb))<4 then raise exception 'History missing redemptions'; end if;
  rejected := false;
  begin perform public.bonbons_admin('invalid-token','coupon_list','{}'::jsonb); exception when sqlstate '28000' then rejected := true; end;
  if not rejected then raise exception 'Unauthenticated coupon listing allowed'; end if;
end
$test$;
rollback;
select 'Coupon transaction assertions passed; all fixtures rolled back' as result;
