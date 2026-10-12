alter table public.products add column ingredients text not null default '' check (length(ingredients)<=5000);
-- Correct the two offers without changing other product prices or stock.
update public.shop_settings set single_pop_price=3,treat_pair_price=5,four_pack_price=10,updated_at=now() where id;
update public.products set price=3,updated_at=clock_timestamp() where category in ('everyday','custom') and deleted_at is null;

create or replace function private.bonbons_catalog_pages(action text,payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $function$
declare
  p jsonb;
  result jsonb;
  current_row public.products%rowtype;
  page_row public.site_pages%rowtype;
  product_price numeric;
  stock integer;
  threshold integer;
  category_value text;
  regular_price numeric;
  pair_price numeric;
  four_price numeric;
begin
  if action='page_list' then
    select coalesce(jsonb_agg(to_jsonb(s) order by slug),'[]'::jsonb) into result from public.site_pages s;
    return result;
  end if;
  if action in ('page_save','page_publish') then
    if payload->>'slug' not in ('home','about') or jsonb_typeof(payload->'content')<>'object' or octet_length((payload->'content')::text)>200000 then
      raise exception 'Enter valid Home or About page content.' using errcode='22023';
    end if;
    select * into page_row from public.site_pages where slug=payload->>'slug' for update;
    if not found then raise exception 'That page was not found.' using errcode='P0002'; end if;
    if (payload->>'revision')::bigint is distinct from page_row.revision then
      raise exception 'This page was changed in another editor. Reload its saved version before saving again.' using errcode='40001';
    end if;
    update public.site_pages s set draft_content=payload->'content',
      published_content=case when action='page_publish' then payload->'content' else s.published_content end,
      published_at=case when action='page_publish' then now() else s.published_at end,
      revision=s.revision+1,updated_at=now()
    where slug=page_row.slug returning to_jsonb(s) into result;
    return result;
  end if;
  if action='update_treat_settings' then
    regular_price=(payload->>'single_pop_price')::numeric;
    pair_price=(payload->>'treat_pair_price')::numeric;
    four_price=(payload->>'four_pack_price')::numeric;
    if four_price is null or four_price<=0 or four_price>500 or round(four_price,2)<>four_price or regular_price is null or pair_price is null or regular_price<=0 or pair_price<=0 or regular_price>500 or pair_price>500 or pair_price>regular_price*2 or round(regular_price,2)<>regular_price or round(pair_price,2)<>pair_price then
      raise exception 'Enter valid regular and two-treat prices. The pair cannot cost more than two regular singles.' using errcode='22023';
    end if;
    update public.shop_settings s set single_pop_price=regular_price,treat_pair_price=pair_price,
      four_pack_price=four_price,updated_at=now() where id returning to_jsonb(s) into result;
    update public.products set price=regular_price,updated_at=now() where category in ('everyday','custom') and deleted_at is null;
    return result;
  end if;
  if action in ('menu_create','menu_update') then
    p=payload->'product';
    product_price=(p->>'price')::numeric;
    stock=(p->>'stock_quantity')::integer;
    threshold=coalesce((p->>'low_stock_threshold')::integer,3);
    category_value=p->>'category';
    if jsonb_typeof(p)<>'object' or length(trim(coalesce(p->>'name','')))=0 or length(p->>'name')>80
      or coalesce(p->>'slug','')!~'^[a-z0-9]+(-[a-z0-9]+)*$' or length(p->>'slug')>100
      or product_price is null or product_price<=0 or product_price>500 or round(product_price,2)<>product_price
      or stock<0 or stock>100000 or threshold<0 or threshold>1000
      or (p ? 'ingredients' and (jsonb_typeof(p->'ingredients')<>'string' or length(p->>'ingredients')>5000))
      or category_value not in ('everyday','pretzel-rods','rice-crispy-treats','dipped-oreos','custom')
      or jsonb_typeof(p->'active')<>'boolean' or jsonb_typeof(p->'bundle_eligible')<>'boolean' then
      raise exception 'Enter valid product, category, price, visibility, and stock details.' using errcode='22023';
    end if;
    if action='menu_update' then
      select * into current_row from public.products where id=(payload->>'id')::bigint for update;
      if not found then raise exception 'That product was not found.' using errcode='P0002'; end if;
      if current_row.deleted_at is not null then raise exception 'Restore this item from Trash before editing it.' using errcode='22023'; end if;
      if (payload->>'expectedUpdatedAt')::timestamptz is distinct from current_row.updated_at then raise exception 'This product changed. Refresh the menu before saving again.' using errcode='40001'; end if;
      if p->>'slug'<>current_row.slug then raise exception 'The product link cannot change after creation.' using errcode='22023'; end if;
      update public.products product set
        name=p->>'name',blurb=coalesce(p->>'blurb',''),description=coalesce(p->>'description',''),ingredients=coalesce(p->>'ingredients',current_row.ingredients),price=product_price,unit='each',
        image=coalesce(p->>'image',''),active=(p->>'active')::boolean,bundle_eligible=(p->>'bundle_eligible')::boolean,
        category=category_value,sort_order=coalesce((p->>'sort_order')::integer,0),
        allergens=array(select jsonb_array_elements_text(coalesce(p->'allergens','[]'::jsonb))),badge=coalesce(p->>'badge',''),source_url=coalesce(p->>'source_url',''),
        stock_quantity=stock,low_stock_threshold=threshold,updated_at=clock_timestamp()
      where id=current_row.id returning to_jsonb(product) into result;
    else
      insert into public.products(slug,name,blurb,description,ingredients,price,unit,image,active,bundle_eligible,category,sort_order,allergens,badge,source_url,stock_quantity,low_stock_threshold)
      values (p->>'slug',p->>'name',coalesce(p->>'blurb',''),coalesce(p->>'description',''),coalesce(p->>'ingredients',''),product_price,'each',coalesce(p->>'image',''),(p->>'active')::boolean,(p->>'bundle_eligible')::boolean,category_value,coalesce((p->>'sort_order')::integer,0),array(select jsonb_array_elements_text(coalesce(p->'allergens','[]'::jsonb))),coalesce(p->>'badge',''),coalesce(p->>'source_url',''),stock,threshold)
      returning to_jsonb(products) into result;
    end if;
    return result;
  end if;
  raise exception 'Unknown page or catalog action.' using errcode='22023';
end;
$function$;
revoke all on function private.bonbons_catalog_pages(text,jsonb) from public,anon,authenticated,service_role;

-- Replace original offer wording; preserve custom page copy and selected photos.
do $copy$
declare
  replacement jsonb;
  current_page public.site_pages%rowtype;
  draft_text text;
  published_text text;
  replacements jsonb := '[["Cake pops, pretzel rods, dipped rice crispy treats, and dipped Oreos, handmade by Bon Bon''s. Regular treats {singlePrice} each or mix and match 2 for {pairPrice}.","Cake pops, pretzel rods, dipped rice crispy treats, and dipped Oreos, handmade by Bon Bon''s. Cake pops {singlePrice} each or 2 for {pairPrice}. Mix four treats for {mixedPrice}, with at most 1 rice crispy treat and 2 Oreos."],["Mix & match two","Mix & match four"],["for one regular treat","for one cake pop"],["for any two flavors","for two cake pops"],["Choose a regular treat for {singlePrice}, or mix any two available flavors for {pairPrice}. Individual prices are listed in the shop.","Cake pops are {singlePrice} each or 2 for {pairPrice}. Mix four treats for {mixedPrice}: maximum 1 rice crispy treat and 2 Oreos per four-pack."],["Two treats.","Four treats."],["A cake pop and a pretzel rod? Two dipped Oreos? Choose any two available flavors across our menu and make a mix that is completely yours.","Cake pops, pretzel rods, dipped rice crispy treats, and dipped Oreos. Mix four favorites for {mixedPrice}, with at most one rice crispy treat and two Oreos in each pack."],["any two flavors","four mixed treats"],["save {saving} compared with regular singles","save {saving} compared with four $3 singles"],["Choose any two flavors for {pairPrice}. Individual prices are listed in the shop.","Prefer cake pops? Choose two for {pairPrice}. Maximum 1 rice crispy treat and 2 Oreos per mixed four-pack."],["Choose a regular treat for {singlePrice} or mix any two available flavors for {pairPrice}. Individual prices are shown in the menu.","Choose {singlePrice} cake pops, two cake pops for {pairPrice}, or a mixed four-pack for {mixedPrice}. Maximum 1 rice crispy treat and 2 Oreos per mixed pack."]]'::jsonb;
begin
  select * into current_page from public.site_pages where slug='home' for update;
  draft_text=current_page.draft_content::text; published_text=current_page.published_content::text;
  for replacement in select value from jsonb_array_elements(replacements) loop
    draft_text=replace(draft_text,to_jsonb(replacement->>0)::text,to_jsonb(replacement->>1)::text);
    published_text=replace(published_text,to_jsonb(replacement->>0)::text,to_jsonb(replacement->>1)::text);
  end loop;
  update public.site_pages set draft_content=draft_text::jsonb,published_content=published_text::jsonb,
    revision=revision+1,updated_at=now(),published_at=now() where slug='home';
end;
$copy$;
