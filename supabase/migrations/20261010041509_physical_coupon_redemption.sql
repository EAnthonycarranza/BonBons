-- The same coupon lock and promotion/email ledger serve online and physical use.
alter table public.coupon_redemptions
  add column channel text not null default 'online' check (channel in ('online', 'admin', 'customer')),
  add column redemption_request_id uuid unique,
  add column customer_name text,
  add column purchase_subtotal numeric(10,2) check (purchase_subtotal > 0),
  add column discount_amount numeric(10,2) check (discount_amount >= 0 and discount_amount <= purchase_subtotal);

update public.coupon_redemptions r set customer_name=o.customer_name,
  purchase_subtotal=o.subtotal_before_discount, discount_amount=o.discount_amount
from public.orders o where r.order_id=o.id;

create function private.bonbons_coupon_redemption(action text, payload jsonb)
returns jsonb language plpgsql security invoker set search_path = ''
as $redeem$
declare
  coupon public.coupons%rowtype;
  redemption public.coupon_redemptions%rowtype;
  requested_code text := upper(trim(coalesce(payload ->> 'code', '')));
  email_in text := lower(trim(coalesce(payload ->> 'customer_email', '')));
  name_in text := trim(coalesce(payload ->> 'customer_name', ''));
  channel_in text := payload ->> 'channel';
  subtotal_in numeric;
  discount numeric(10,2);
  request_id uuid;
  result jsonb;
begin
  if action = 'coupon_redemptions' then
    select coalesce(jsonb_agg(to_jsonb(r) order by r.redeemed_at desc, r.id desc), '[]'::jsonb)
    into result from (
      select r.id, c.code, c.name as campaign, r.customer_email, r.customer_name,
        r.channel, r.redeemed_at, r.redemption_request_id as reference,
        r.order_id, r.discount_amount, r.purchase_subtotal
      from public.coupon_redemptions r join public.coupons c on c.id=r.coupon_id
      order by r.redeemed_at desc, r.id desc limit 200
    ) r;
    return result;
  end if;
  if action <> 'coupon_redeem' then raise exception 'Unknown redemption action.' using errcode='22023'; end if;
  if channel_in is null or channel_in not in ('admin', 'customer') then
    raise exception 'Choose a physical redemption method.' using errcode='22023';
  end if;
  if length(email_in) > 254 or email_in !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(name_in)>120 then
    raise exception 'Enter a valid customer email.' using errcode='22023';
  end if;
  request_id := (payload ->> 'request_id')::uuid;
  subtotal_in := (payload ->> 'subtotal')::numeric;
  if request_id is null or subtotal_in is null or subtotal_in = 'NaN'::numeric or subtotal_in not between 0.01 and 100000 or round(subtotal_in,2)<>subtotal_in then
    raise exception 'Enter a valid purchase subtotal and request ID.' using errcode='22023';
  end if;
  select * into coupon from public.coupons where code=requested_code for update;
  if not found then raise exception 'This coupon code is invalid or no longer available.' using errcode='22023'; end if;

  select * into redemption from public.coupon_redemptions where redemption_request_id=request_id;
  if found then
    if redemption.coupon_id<>coupon.id or redemption.customer_email<>email_in or
       redemption.purchase_subtotal<>subtotal_in or redemption.channel<>channel_in or
       coalesce(redemption.customer_name,'')<>name_in then
      raise exception 'This request has changed. Please start a new redemption.' using errcode='22023';
    end if;
    result := jsonb_build_object('replayed',true);
  else
    if not coupon.active or coupon.redemption_count>=coupon.max_redemptions or coupon.expires_on<(now() at time zone 'America/Chicago')::date then
      raise exception 'This coupon code is invalid or no longer available.' using errcode='22023';
    end if;
    if exists(select 1 from public.coupon_redemptions where promotion_key=coupon.promotion_key and customer_email=email_in) then
      raise exception 'This email has already redeemed a coupon for this promotion.' using errcode='22023';
    end if;
    if subtotal_in<coupon.minimum_subtotal then
      raise exception 'This coupon requires a purchase of at least $%.', coupon.minimum_subtotal using errcode='22023';
    end if;
    discount := least(coupon.discount_amount,subtotal_in);
    begin
      insert into public.coupon_redemptions(coupon_id,promotion_key,customer_email,customer_name,channel,redemption_request_id,purchase_subtotal,discount_amount)
      values(coupon.id,coupon.promotion_key,email_in,name_in,channel_in,request_id,subtotal_in,discount)
      returning * into redemption;
    exception when unique_violation then
      raise exception 'This redemption was already recorded. Check the code and customer email.' using errcode='22023';
    end;
    update public.coupons set redemption_count=redemption_count+1 where id=coupon.id;
    result := jsonb_build_object('replayed',false);
  end if;
  return result || jsonb_build_object('code',coupon.code,'discountAmount',redemption.discount_amount,
    'originalSubtotal',redemption.purchase_subtotal,'subtotal',redemption.purchase_subtotal-redemption.discount_amount,
    'reference',redemption.redemption_request_id,'redeemedAt',redemption.redeemed_at,'channel',redemption.channel);
end
$redeem$;
revoke all on function private.bonbons_coupon_redemption(text,jsonb) from public,anon,authenticated,service_role;

do $extend$
declare definition text;
begin
  select pg_get_functiondef('public.bonbons_admin(text,text,jsonb)'::regprocedure) into definition;
  if position('if action = ''list_weekly_boxes'' then' in definition)=0 then raise exception 'Apply the earlier migrations first.'; end if;
  definition := replace(definition, 'if action = ''list_weekly_boxes'' then',
    'if action in (''coupon_redemptions'', ''coupon_redeem'') then
    return private.bonbons_coupon_redemption(action,payload);
  end if;

  if action = ''list_weekly_boxes'' then');
  execute definition;

  select pg_get_functiondef('private.bonbons_coupons(text,jsonb)'::regprocedure) into definition;
  if position('insert into public.coupon_redemptions(coupon_id, order_id, promotion_key, customer_email)' in definition)=0 then raise exception 'Apply the promotion migration first.'; end if;
  definition := replace(definition,
    'insert into public.coupon_redemptions(coupon_id, order_id, promotion_key, customer_email)
    values (coupon.id, saved_order.id, coupon.promotion_key, lower(trim(saved_order.customer_email)));',
    'insert into public.coupon_redemptions(coupon_id, order_id, promotion_key, customer_email, customer_name, purchase_subtotal, discount_amount)
    values (coupon.id, saved_order.id, coupon.promotion_key, lower(trim(saved_order.customer_email)), saved_order.customer_name, saved_order.subtotal_before_discount, saved_order.discount_amount);');
  execute definition;
end
$extend$;
notify pgrst, 'reload schema';
