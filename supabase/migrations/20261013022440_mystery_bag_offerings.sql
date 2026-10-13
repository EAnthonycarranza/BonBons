-- Mystery bags are independently priced catalog products, with stock counted per bag.
-- Existing products remain standard; no products or visibility changes are seeded.
alter table public.products
 add column offering_type text not null default 'standard' check(offering_type in ('standard','mystery-bag')),
 add column bonus_description text not null default '' check(length(trim(bonus_description))<=160),
 add constraint mystery_bags_own_price_and_stock check(offering_type<>'mystery-bag' or (not bundle_eligible and stock_quantity is not null)),
 add constraint standard_products_no_bonus check(offering_type='mystery-bag' or bonus_description='');
insert into public.menu_categories(slug,name,treat_type,sort_order)
 values('mystery-bags','Mystery Bags','other',50) on conflict(slug) do nothing;

create or replace function private.bonbons_flexible_catalog(action text,payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare
 input_row jsonb; result jsonb; cat public.menu_categories%rowtype; product public.products%rowtype; box public.weekly_boxes%rowtype;
 price_value numeric; stock integer; threshold integer; count_value integer; label_value text;
 contents jsonb := '[]'::jsonb; entry jsonb; quantity integer; total integer:=0; box_kind text; offering_kind text; bonus text;
 regular_price numeric; pair_price numeric; four_price numeric;
begin
 if action='category_list' then
   select coalesce(jsonb_agg(jsonb_build_object('slug',c.slug,'name',c.name,'treatType',c.treat_type,'sortOrder',c.sort_order,'updatedAt',c.updated_at,
    'productCount',(select count(*) from public.products p where p.category=c.slug and p.deleted_at is null)) order by c.sort_order,c.name),'[]'::jsonb) into result from public.menu_categories c;
   return result;
 end if;
 if action in ('category_create','category_update') then
   if length(trim(coalesce(payload->>'name',''))) not between 1 and 60 or coalesce(payload->>'slug','')!~'^[a-z0-9]+(-[a-z0-9]+)*$'
     or length(payload->>'slug')>100 or coalesce(payload->>'treat_type','') not in ('cake-pops','pretzel-rods','rice-crispy-treats','dipped-oreos','other')
     or coalesce((payload->>'sort_order')::integer,-1) not between 0 and 10000 then raise exception 'Enter a valid category name, type, and display order.' using errcode='22023'; end if;
   if action='category_create' then
     insert into public.menu_categories(slug,name,treat_type,sort_order) values(payload->>'slug',trim(payload->>'name'),payload->>'treat_type',(payload->>'sort_order')::integer) returning * into cat;
   else
     select * into cat from public.menu_categories where slug=payload->>'slug' for update;
     if not found then raise exception 'Category not found.' using errcode='P0002'; end if;
     if cat.updated_at is distinct from (payload->>'expectedUpdatedAt')::timestamptz then raise exception 'This category changed. Refresh before saving again.' using errcode='40001'; end if;
     if cat.treat_type<>payload->>'treat_type' then raise exception 'The treat type cannot change. Create another category for a different type.' using errcode='22023'; end if;
     update public.menu_categories set name=trim(payload->>'name'),sort_order=(payload->>'sort_order')::integer,updated_at=clock_timestamp() where slug=cat.slug returning * into cat;
   end if;
   return jsonb_build_object('slug',cat.slug,'name',cat.name,'treatType',cat.treat_type,'sortOrder',cat.sort_order,'updatedAt',cat.updated_at,
    'productCount',(select count(*) from public.products p where p.category=cat.slug and p.deleted_at is null));
 end if;
 if action='menu_list' then
   select coalesce(jsonb_agg(to_jsonb(p)||jsonb_build_object('category_label',c.name,'treat_type',c.treat_type,'category_order',c.sort_order) order by p.sort_order,p.name),'[]'::jsonb) into result
   from public.products p join public.menu_categories c on c.slug=p.category;
   return result;
 end if;
 if action='update_treat_settings' then
   regular_price=(payload->>'single_pop_price')::numeric; pair_price=(payload->>'treat_pair_price')::numeric; four_price=(payload->>'four_pack_price')::numeric;
   if regular_price is null or pair_price is null or four_price is null or regular_price<=0 or pair_price<=0 or four_price<=0 or regular_price>500 or pair_price>500 or four_price>500
    or pair_price>2*regular_price or round(regular_price,2)<>regular_price or round(pair_price,2)<>pair_price or round(four_price,2)<>four_price then raise exception 'Enter valid cake-pop, pair, and mixed-pack prices.' using errcode='22023'; end if;
   update public.shop_settings s set single_pop_price=regular_price,treat_pair_price=pair_price,four_pack_price=four_price,updated_at=clock_timestamp() where id returning to_jsonb(s) into result;
   update public.products p set price=regular_price,updated_at=clock_timestamp() from public.menu_categories c where c.slug=p.category and c.treat_type='cake-pops' and p.unit_count=1 and p.offering_type='standard' and p.deleted_at is null;
   return result;
 end if;
 if action in ('menu_create','menu_update') then
   input_row=payload->'product'; price_value=(input_row->>'price')::numeric; stock=(input_row->>'stock_quantity')::integer; threshold=coalesce((input_row->>'low_stock_threshold')::integer,3);
   offering_kind=coalesce(input_row->>'offering_type','standard'); bonus=case when offering_kind='mystery-bag' then trim(coalesce(input_row->>'bonus_description','')) else '' end;
   count_value=coalesce((input_row->>'unit_count')::integer,1); label_value=coalesce(nullif(trim(input_row->>'unit_label'),''),'treats');
   select * into cat from public.menu_categories where slug=input_row->>'category';
   if not found then raise exception 'Choose a saved category, or add a new category first.' using errcode='22023'; end if;
   if jsonb_typeof(input_row) is distinct from 'object' or length(trim(coalesce(input_row->>'name',''))) not between 1 and 80
     or coalesce(input_row->>'slug','')!~'^[a-z0-9]+(-[a-z0-9]+)*$' or length(input_row->>'slug')>100 or price_value is null or price_value<=0 or price_value>500 or round(price_value,2)<>price_value
     or stock<0 or stock>100000 or threshold not between 0 and 1000 or count_value not between 1 and 1000 or length(label_value)>50
     or length(coalesce(input_row->>'ingredients',''))>5000 or length(coalesce(input_row->>'description',''))>2000 or length(coalesce(input_row->>'blurb',''))>160
     or jsonb_typeof(input_row->'active') is distinct from 'boolean' or jsonb_typeof(input_row->'bundle_eligible') is distinct from 'boolean'
     or offering_kind not in ('standard','mystery-bag') or length(bonus)>160
     or (offering_kind='mystery-bag' and (stock is null or (input_row->>'bundle_eligible')::boolean))
     or (count_value>1 and (input_row->>'bundle_eligible')::boolean) then raise exception 'Enter valid item, batch size, price, ingredients, visibility, and stock details.' using errcode='22023'; end if;
   if action='menu_update' then
     select * into product from public.products where id=(payload->>'id')::bigint for update;
     if not found then raise exception 'That product was not found.' using errcode='P0002'; end if;
     if product.deleted_at is not null then raise exception 'Restore this item from Trash before editing it.' using errcode='22023'; end if;
     if product.updated_at is distinct from (payload->>'expectedUpdatedAt')::timestamptz then raise exception 'This product changed. Refresh the menu before saving again.' using errcode='40001'; end if;
     if input_row->>'slug'<>product.slug then raise exception 'The product link cannot change after creation.' using errcode='22023'; end if;
     update public.products q set name=input_row->>'name',blurb=coalesce(input_row->>'blurb',''),description=coalesce(input_row->>'description',''),ingredients=coalesce(input_row->>'ingredients',product.ingredients),price=price_value,
      unit=case when offering_kind='mystery-bag' then 'per bag' when count_value=1 then 'each' else 'per batch of '||count_value||' '||label_value end,unit_count=count_value,unit_label=label_value,offering_type=offering_kind,bonus_description=bonus,
      image=coalesce(input_row->>'image',''),active=(input_row->>'active')::boolean,bundle_eligible=(input_row->>'bundle_eligible')::boolean,category=cat.slug,sort_order=coalesce((input_row->>'sort_order')::integer,0),
      allergens=array(select jsonb_array_elements_text(coalesce(input_row->'allergens','[]'::jsonb))),badge=coalesce(input_row->>'badge',''),source_url=coalesce(input_row->>'source_url',''),stock_quantity=stock,low_stock_threshold=threshold,updated_at=clock_timestamp()
      where id=product.id returning * into product;
   else
     insert into public.products(slug,name,blurb,description,ingredients,price,unit,unit_count,unit_label,image,active,bundle_eligible,category,sort_order,allergens,badge,source_url,stock_quantity,low_stock_threshold,offering_type,bonus_description)
      values(input_row->>'slug',input_row->>'name',coalesce(input_row->>'blurb',''),coalesce(input_row->>'description',''),coalesce(input_row->>'ingredients',''),price_value,case when offering_kind='mystery-bag' then 'per bag' when count_value=1 then 'each' else 'per batch of '||count_value||' '||label_value end,count_value,label_value,
       coalesce(input_row->>'image',''),(input_row->>'active')::boolean,(input_row->>'bundle_eligible')::boolean,cat.slug,coalesce((input_row->>'sort_order')::integer,0),array(select jsonb_array_elements_text(coalesce(input_row->'allergens','[]'::jsonb))),coalesce(input_row->>'badge',''),coalesce(input_row->>'source_url',''),stock,threshold,offering_kind,bonus)
      returning * into product;
   end if;
   return to_jsonb(product)||jsonb_build_object('category_label',cat.name,'treat_type',cat.treat_type,'category_order',cat.sort_order);
 end if;
 if action='list_weekly_boxes' then
   select coalesce(jsonb_agg(to_jsonb(w)||jsonb_build_object('items',coalesce(c.items,w.items)) order by w.featured desc,w.created_at desc),'[]'::jsonb) into result
     from public.weekly_boxes w left join private.weekly_box_contents c on c.box_id=w.id;
   return result;
 end if;
 if action in ('create_weekly_box','update_weekly_box','delete_weekly_box') then
   perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('bonbons_weekly_featured',0));
   if action<>'create_weekly_box' then
     select * into box from public.weekly_boxes where id=(payload->>'id')::bigint for update;
     if not found then raise exception 'That box was not found.' using errcode='P0002'; end if;
     if action='delete_weekly_box' then delete from public.weekly_boxes where id=box.id; return jsonb_build_object('ok',true); end if;
     if payload ? 'expectedUpdatedAt' and box.updated_at is distinct from (payload->>'expectedUpdatedAt')::timestamptz then raise exception 'This box changed. Refresh before saving again.' using errcode='40001'; end if;
     if box.slug<>payload->>'slug' then raise exception 'The box link cannot change after creation.' using errcode='22023'; end if;
   end if;
   input_row=payload; box_kind=coalesce(input_row->>'box_type','listed'); price_value=(input_row->>'price')::numeric; stock=(input_row->>'stock_quantity')::integer; threshold=coalesce((input_row->>'low_stock_threshold')::integer,5);
   if box_kind not in ('listed','mystery') or price_value is null or price_value<=0 or price_value>500 or round(price_value,2)<>price_value
    or stock is null or stock not between 0 and 100000 or threshold not between 0 and 1000 or length(trim(coalesce(input_row->>'title',''))) not between 1 and 90
    or coalesce(input_row->>'slug','')!~'^[a-z0-9]+(-[a-z0-9]+)*$' or length(input_row->>'slug')>100
    or jsonb_typeof(input_row->'active') is distinct from 'boolean' or jsonb_typeof(input_row->'featured') is distinct from 'boolean'
    or jsonb_typeof(input_row->'items') is distinct from 'array' or jsonb_array_length(input_row->'items')>40 then raise exception 'Enter valid box, price, stock, and contents details.' using errcode='22023'; end if;
   if (select count(distinct i->>'slug') from jsonb_array_elements(input_row->'items') i)<>jsonb_array_length(input_row->'items') then raise exception 'List each product once and use its quantity for multiples.' using errcode='22023'; end if;
   for entry in select value from jsonb_array_elements(input_row->'items') loop
     select * into product from public.products where slug=entry->>'slug' and deleted_at is null for share;
     if not found then raise exception 'Choose every box item from your saved products.' using errcode='22023'; end if;
     quantity=(entry->>'qty')::integer;
     if quantity is null or quantity not between 1 and 99 or length(coalesce(entry->>'note',''))>160 then raise exception 'Choose a valid item quantity and note.' using errcode='22023'; end if;
     contents=contents||jsonb_build_array(jsonb_build_object('slug',product.slug,'name',product.name,'qty',quantity,'note',coalesce(entry->>'note',''),'unit_count',product.unit_count,'unit_label',product.unit_label,'offering_type',product.offering_type,'bonus_description',product.bonus_description));
     total=total+quantity*product.unit_count;
   end loop;
   count_value=case when box_kind='mystery' then (input_row->>'treat_count')::integer else total end;
   if count_value is null or count_value not between 1 and 10000 or (box_kind='mystery' and total>0 and total<>count_value) then raise exception 'Set a valid treat count matching your selected contents.' using errcode='22023'; end if;
   if (input_row->>'featured')::boolean and (input_row->>'active')::boolean then update public.weekly_boxes w set featured=false,updated_at=clock_timestamp() where w.featured and w.active and (box.id is null or w.id<>box.id); end if;
   if action='create_weekly_box' then
     insert into public.weekly_boxes(slug,title,tagline,description,price,stock_quantity,initial_stock,low_stock_threshold,items,box_type,treat_count,image,active,featured)
     values(input_row->>'slug',input_row->>'title',coalesce(input_row->>'tagline',''),coalesce(input_row->>'description',''),price_value,stock,stock,threshold,case when box_kind='mystery' then '[]'::jsonb else contents end,box_kind,count_value,coalesce(input_row->>'image',''),(input_row->>'active')::boolean,(input_row->>'featured')::boolean) returning * into box;
   else
     update public.weekly_boxes w set title=input_row->>'title',tagline=coalesce(input_row->>'tagline',''),description=coalesce(input_row->>'description',''),price=price_value,stock_quantity=stock,initial_stock=greatest(w.initial_stock,stock),low_stock_threshold=threshold,
      items=case when box_kind='mystery' then '[]'::jsonb else contents end,box_type=box_kind,treat_count=count_value,image=coalesce(input_row->>'image',''),active=(input_row->>'active')::boolean,featured=(input_row->>'featured')::boolean,updated_at=clock_timestamp()
      where id=box.id returning * into box;
   end if;
   insert into private.weekly_box_contents(box_id,items) values(box.id,contents) on conflict(box_id) do update set items=excluded.items;
   return to_jsonb(box)||jsonb_build_object('items',contents);
 end if;
 raise exception 'Unknown catalog action.' using errcode='22023';
end;
$fn$;
revoke all on function private.bonbons_flexible_catalog(text,jsonb) from public,anon,authenticated,service_role;

-- Abort on failed assertions, but discard successful test fixtures.
do $qa$
declare draft jsonb; saved jsonb; updated jsonb; rejected boolean;
begin
 begin
 draft='{"slug":"qa-mystery-bags-rollback","name":"QA Mystery Bags rollback","category":"mystery-bags","offering_type":"mystery-bag","unit_count":4,"unit_label":"cake pops","bonus_description":"a sweet surprise","price":10,"stock_quantity":4,"active":false,"bundle_eligible":false}'::jsonb;
 saved=private.bonbons_flexible_catalog('menu_create',jsonb_build_object('product',draft));
 if saved->>'offering_type'<>'mystery-bag' or saved->>'unit'<>'per bag' or saved->>'bonus_description'<>'a sweet surprise' or (saved->>'stock_quantity')::int<>4 or (saved->>'active')::boolean then raise exception 'Bag promise, stock, price unit, or visibility was not saved'; end if;
 updated=private.bonbons_flexible_catalog('menu_update',jsonb_build_object('id',saved->'id','expectedUpdatedAt',saved->>'updated_at','product',jsonb_set(draft,'{stock_quantity}','2')));
 if (updated->>'stock_quantity')::int<>2 or updated->>'offering_type'<>'mystery-bag' then raise exception 'Bag restock or type was not preserved'; end if;
 rejected=false;
 begin perform private.bonbons_flexible_catalog('menu_update',jsonb_build_object('id',saved->'id','expectedUpdatedAt',saved->>'updated_at','product',draft)); exception when serialization_failure then rejected=true; end;
 if not rejected then raise exception 'Stale bag inventory overwrite was allowed'; end if;
 rejected=false;
 begin perform private.bonbons_flexible_catalog('menu_create',jsonb_build_object('product',draft||'{"slug":"qa-bag-bad-stock","stock_quantity":null}'::jsonb)); exception when invalid_parameter_value then rejected=true; end;
 if not rejected then raise exception 'Bag without counted stock was allowed'; end if;
 rejected=false;
 begin perform private.bonbons_flexible_catalog('menu_create',jsonb_build_object('product',draft||'{"slug":"qa-bag-bad-bundle","unit_count":1,"bundle_eligible":true}'::jsonb)); exception when invalid_parameter_value then rejected=true; end;
 if not rejected then raise exception 'Bag was allowed to join individual treat offers'; end if;
 -- A one-treat mystery bag still keeps its own price, even on the cake-pop shelf.
 updated=private.bonbons_flexible_catalog('menu_update',jsonb_build_object('id',updated->'id','expectedUpdatedAt',updated->>'updated_at','product',draft||'{"category":"everyday","unit_count":1}'::jsonb));
 perform private.bonbons_flexible_catalog('update_treat_settings','{"single_pop_price":3,"treat_pair_price":5,"four_pack_price":10}'::jsonb);
 if (select price from public.products where id=(updated->>'id')::bigint)<>10 then raise exception 'Headline single price overwrote a bag price'; end if;
 rejected=false;
 begin perform public.bonbons_admin('invalid-token','menu_create',jsonb_build_object('product',draft)); exception when invalid_authorization_specification then rejected=true; end;
 if not rejected then raise exception 'Bag admin write accepted an invalid token'; end if;
 raise exception 'Rollback QA fixtures' using errcode='P9999';
 exception when sqlstate 'P9999' then null; end;
end;
$qa$;
