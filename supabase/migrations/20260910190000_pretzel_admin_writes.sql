-- The Shop Desk needs to set a product's category (so a rod can be filed under
-- pretzel-rods) and whether it bundles, and to save the two pretzel prices.
--
-- Both go through bonbons_admin for the same reason price and stock already do:
-- the deployed bonbons-data Edge Function predates these fields and drops them.
-- Patching the two branches here keeps the desk working without a redeploy.

do $migration$
declare
  source text;
  patched text;
begin
  select pg_get_functiondef(p.oid) into source
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'bonbons_admin';

  if source is null then
    raise exception 'bonbons_admin() is missing; apply the earlier migrations first.';
  end if;

  -- 1) carry category and bundle_eligible alongside the price correction
  patched := replace(
    source,
$old$      low_stock_threshold = coalesce((payload ->> 'low_stock_threshold')::integer, 3),
      updated_at = now()
    where id = (payload ->> 'id')::bigint$old$,
$new$      low_stock_threshold = coalesce((payload ->> 'low_stock_threshold')::integer, 3),
      category = coalesce(nullif(payload ->> 'category', ''), category),
      bundle_eligible = coalesce((payload ->> 'bundle_eligible')::boolean, bundle_eligible),
      updated_at = now()
    where id = (payload ->> 'id')::bigint$new$
  );

  -- 2) persist the pretzel prices, leaving them untouched when not supplied
  patched := replace(
    patched,
$old$    insert into public.shop_settings (id, single_pop_price, four_pack_price, updated_at)
    values (true, (payload ->> 'single_pop_price')::numeric,
            (payload ->> 'four_pack_price')::numeric, now())
    on conflict (id) do update
      set single_pop_price = excluded.single_pop_price,
          four_pack_price = excluded.four_pack_price,
          updated_at = now();$old$,
$new$    insert into public.shop_settings (id, single_pop_price, four_pack_price,
                                      pretzel_rod_price, pretzel_pair_price, updated_at)
    values (true, (payload ->> 'single_pop_price')::numeric,
            (payload ->> 'four_pack_price')::numeric,
            coalesce((payload ->> 'pretzel_rod_price')::numeric, 3),
            coalesce((payload ->> 'pretzel_pair_price')::numeric, 5), now())
    on conflict (id) do update
      set single_pop_price = excluded.single_pop_price,
          four_pack_price = excluded.four_pack_price,
          pretzel_rod_price = coalesce((payload ->> 'pretzel_rod_price')::numeric,
                                       public.shop_settings.pretzel_rod_price),
          pretzel_pair_price = coalesce((payload ->> 'pretzel_pair_price')::numeric,
                                        public.shop_settings.pretzel_pair_price),
          updated_at = now();$new$
  );

  if patched = source then
    raise exception 'bonbons_admin() did not match either expected branch; it has changed shape.';
  end if;

  execute patched;
end
$migration$;

-- The grant is on the function signature, which has not changed, but re-running
-- it costs nothing and guards against a replace that dropped it.
revoke all on function public.bonbons_admin(text, text, jsonb) from public;
grant execute on function public.bonbons_admin(text, text, jsonb) to anon;
