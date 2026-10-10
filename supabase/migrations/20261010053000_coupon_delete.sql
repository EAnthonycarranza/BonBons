-- Staff can delete coupons that were never used. A used coupon is part of an
-- order's and the promotion ledger's history, so it can only be disabled.
do $extend$
declare definition text;
begin
  select pg_get_functiondef('private.bonbons_coupons(text,jsonb)'::regprocedure) into definition;
  if position('code_in text;' in definition)=0 or position('if action = ''coupon_update'' then' in definition)=0 then
    raise exception 'Apply the coupon system migration first.';
  end if;
  if position('coupon_delete' in definition)=0 then
    definition := replace(definition, 'code_in text;', 'code_in text;
  ids bigint[];');
    definition := replace(definition, 'if action = ''coupon_update'' then',
      'if action = ''coupon_delete'' then
    if jsonb_typeof(payload -> ''ids'') is distinct from ''array''
       or jsonb_array_length(payload -> ''ids'') not between 1 and 500 then
      raise exception ''Choose between 1 and 500 coupons to delete.'' using errcode = ''22023'';
    end if;
    select array_agg(distinct value::bigint) into ids from jsonb_array_elements_text(payload -> ''ids'');
    perform 1 from public.coupons where id = any(ids) for update;
    if exists (select 1 from public.coupons where id = any(ids) and redemption_count > 0)
       or exists (select 1 from public.coupon_redemptions where coupon_id = any(ids)) then
      raise exception ''Used coupons stay in your records. Disable them instead, or unselect them to delete the rest.'' using errcode = ''22023'';
    end if;
    with deleted as (delete from public.coupons where id = any(ids) returning id)
    select coalesce(jsonb_agg(to_jsonb(id::text)), ''[]''::jsonb) into result from deleted;
    return result;
  end if;

  if action = ''coupon_update'' then');
    execute definition;
  end if;

  select pg_get_functiondef('public.bonbons_admin(text,text,jsonb)'::regprocedure) into definition;
  if position('''coupon_update'', ''coupon_preview''' in definition)=0 then
    raise exception 'Apply the coupon system migration first.';
  end if;
  if position('coupon_delete' in definition)=0 then
    definition := replace(definition, '''coupon_update'', ''coupon_preview''', '''coupon_update'', ''coupon_delete'', ''coupon_preview''');
    execute definition;
  end if;
end
$extend$;
notify pgrst, 'reload schema';
