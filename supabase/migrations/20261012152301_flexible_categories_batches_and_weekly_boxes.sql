create table public.menu_categories (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug)<=100),
  name text not null check (length(trim(name)) between 1 and 60),
  treat_type text not null default 'other' check (treat_type in ('cake-pops','pretzel-rods','rice-crispy-treats','dipped-oreos','other')),
  sort_order integer not null default 50 check (sort_order between 0 and 10000),
  updated_at timestamptz not null default now()
);
create unique index menu_categories_name_unique on public.menu_categories(lower(regexp_replace(trim(name),'\s+',' ','g')));
alter table public.menu_categories enable row level security;
revoke all on public.menu_categories from public,anon,authenticated,service_role;
grant select on public.menu_categories to anon,authenticated;
create policy "Visitors read menu categories" on public.menu_categories for select to anon,authenticated using(true);
insert into public.menu_categories(slug,name,treat_type,sort_order) values
 ('everyday','Cake Pops','cake-pops',0),('pretzel-rods','Pretzel Rods','pretzel-rods',10),
 ('rice-crispy-treats','Dipped Rice Crispy Treats','rice-crispy-treats',20),
 ('dipped-oreos','Dipped Oreos','dipped-oreos',30),('custom','Specialty & Custom Cake Pops','cake-pops',40);
insert into public.menu_categories(slug,name) select distinct category,initcap(replace(category,'-',' ')) from public.products where category not in (select slug from public.menu_categories);
alter table public.products add constraint products_category_fkey foreign key(category) references public.menu_categories(slug);
-- Replace the old rule that forced every product into discounted offers.
drop trigger every_treat_flavor_in_pair on public.products;
drop function private.include_every_treat_flavor();
alter table public.products add column unit_count integer not null default 1 check(unit_count between 1 and 1000),
 add column unit_label text not null default 'treats' check(length(trim(unit_label)) between 1 and 50),
 add constraint product_batches_no_bundle check(unit_count=1 or not bundle_eligible);
alter table public.weekly_boxes add column box_type text not null default 'listed' check(box_type in ('listed','mystery')),
 add column treat_count integer not null default 0 check(treat_count between 0 and 10000),
 add constraint mystery_contents_private check(box_type<>'mystery' or jsonb_array_length(items)=0);
update public.weekly_boxes w set treat_count=(select coalesce(sum((i->>'qty')::integer),0) from jsonb_array_elements(w.items) i);
create table private.weekly_box_contents (
 box_id bigint primary key references public.weekly_boxes(id) on delete cascade,
 items jsonb not null check(jsonb_typeof(items)='array' and jsonb_array_length(items)<=40)
);
alter table private.weekly_box_contents enable row level security;
revoke all on private.weekly_box_contents from public,anon,authenticated,service_role;
insert into private.weekly_box_contents(box_id,items) select id,items from public.weekly_boxes;
drop index public.weekly_boxes_single_featured_idx;
create unique index weekly_boxes_single_featured_idx on public.weekly_boxes(featured) where featured and active;

create function private.bonbons_flexible_catalog(action text,payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare
 input_row jsonb; result jsonb; cat public.menu_categories%rowtype; product public.products%rowtype; box public.weekly_boxes%rowtype;
 price_value numeric; stock integer; threshold integer; count_value integer; label_value text;
 contents jsonb := '[]'::jsonb; entry jsonb; quantity integer; total integer:=0; box_kind text;
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
   update public.products p set price=regular_price,updated_at=clock_timestamp() from public.menu_categories c where c.slug=p.category and c.treat_type='cake-pops' and p.unit_count=1 and p.deleted_at is null;
   return result;
 end if;
 if action in ('menu_create','menu_update') then
   input_row=payload->'product'; price_value=(input_row->>'price')::numeric; stock=(input_row->>'stock_quantity')::integer; threshold=coalesce((input_row->>'low_stock_threshold')::integer,3);
   count_value=coalesce((input_row->>'unit_count')::integer,1); label_value=coalesce(nullif(trim(input_row->>'unit_label'),''),'treats');
   select * into cat from public.menu_categories where slug=input_row->>'category';
   if not found then raise exception 'Choose a saved category, or add a new category first.' using errcode='22023'; end if;
   if jsonb_typeof(input_row) is distinct from 'object' or length(trim(coalesce(input_row->>'name',''))) not between 1 and 80
     or coalesce(input_row->>'slug','')!~'^[a-z0-9]+(-[a-z0-9]+)*$' or length(input_row->>'slug')>100 or price_value is null or price_value<=0 or price_value>500 or round(price_value,2)<>price_value
     or stock<0 or stock>100000 or threshold not between 0 and 1000 or count_value not between 1 and 1000 or length(label_value)>50
     or length(coalesce(input_row->>'ingredients',''))>5000 or length(coalesce(input_row->>'description',''))>2000 or length(coalesce(input_row->>'blurb',''))>160
     or jsonb_typeof(input_row->'active') is distinct from 'boolean' or jsonb_typeof(input_row->'bundle_eligible') is distinct from 'boolean'
     or (count_value>1 and (input_row->>'bundle_eligible')::boolean) then raise exception 'Enter valid item, batch size, price, ingredients, visibility, and stock details.' using errcode='22023'; end if;
   if action='menu_update' then
     select * into product from public.products where id=(payload->>'id')::bigint for update;
     if not found then raise exception 'That product was not found.' using errcode='P0002'; end if;
     if product.deleted_at is not null then raise exception 'Restore this item from Trash before editing it.' using errcode='22023'; end if;
     if product.updated_at is distinct from (payload->>'expectedUpdatedAt')::timestamptz then raise exception 'This product changed. Refresh the menu before saving again.' using errcode='40001'; end if;
     if input_row->>'slug'<>product.slug then raise exception 'The product link cannot change after creation.' using errcode='22023'; end if;
     update public.products q set name=input_row->>'name',blurb=coalesce(input_row->>'blurb',''),description=coalesce(input_row->>'description',''),ingredients=coalesce(input_row->>'ingredients',product.ingredients),price=price_value,
      unit=case when count_value=1 then 'each' else 'per batch of '||count_value||' '||label_value end,unit_count=count_value,unit_label=label_value,
      image=coalesce(input_row->>'image',''),active=(input_row->>'active')::boolean,bundle_eligible=(input_row->>'bundle_eligible')::boolean,category=cat.slug,sort_order=coalesce((input_row->>'sort_order')::integer,0),
      allergens=array(select jsonb_array_elements_text(coalesce(input_row->'allergens','[]'::jsonb))),badge=coalesce(input_row->>'badge',''),source_url=coalesce(input_row->>'source_url',''),stock_quantity=stock,low_stock_threshold=threshold,updated_at=clock_timestamp()
      where id=product.id returning * into product;
   else
     insert into public.products(slug,name,blurb,description,ingredients,price,unit,unit_count,unit_label,image,active,bundle_eligible,category,sort_order,allergens,badge,source_url,stock_quantity,low_stock_threshold)
      values(input_row->>'slug',input_row->>'name',coalesce(input_row->>'blurb',''),coalesce(input_row->>'description',''),coalesce(input_row->>'ingredients',''),price_value,case when count_value=1 then 'each' else 'per batch of '||count_value||' '||label_value end,count_value,label_value,
       coalesce(input_row->>'image',''),(input_row->>'active')::boolean,(input_row->>'bundle_eligible')::boolean,cat.slug,coalesce((input_row->>'sort_order')::integer,0),array(select jsonb_array_elements_text(coalesce(input_row->'allergens','[]'::jsonb))),coalesce(input_row->>'badge',''),coalesce(input_row->>'source_url',''),stock,threshold)
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
     contents=contents||jsonb_build_array(jsonb_build_object('slug',product.slug,'name',product.name,'qty',quantity,'note',coalesce(entry->>'note',''),'unit_count',product.unit_count,'unit_label',product.unit_label));
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
create or replace function public.bonbons_admin(auth_token text,action text,payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $fn$
begin
 perform private.bonbons_admin_legacy(auth_token,'get_shop_settings','{}'::jsonb);
 if action in ('category_list','category_create','category_update','menu_list','menu_create','menu_update','update_treat_settings','list_weekly_boxes','create_weekly_box','update_weekly_box','delete_weekly_box') then return private.bonbons_flexible_catalog(action,payload); end if;
 if action in ('order_submit','order_notification_claim','order_notification_finish','order_notification_retry','order_notification_order') then return private.bonbons_order_requests(action,payload); end if;
 if action in ('page_list','page_save','page_publish') then return private.bonbons_catalog_pages(action,payload); end if;
 return private.bonbons_admin_legacy(auth_token,action,payload);
end;
$fn$;
revoke all on function public.bonbons_admin(text,text,jsonb) from public,authenticated;
grant execute on function public.bonbons_admin(text,text,jsonb) to anon,service_role;

-- Generalize only the original weekly feature copy; custom page text is preserved.
do $copy$
declare current_page public.site_pages%rowtype; draft_text text; published_text text; original text := 'Meet the {boxTitle}: {popCount} handmade cake pops, {flavorCount} flavors, and a little something to look forward to.'; revised text := 'Meet the {boxTitle}: {popCount} handmade treats, {flavorCount} varieties, and a little something to look forward to.';
begin
 select * into current_page from public.site_pages where slug='home' for update;
 draft_text=replace(current_page.draft_content::text,to_jsonb(original)::text,to_jsonb(revised)::text);
 published_text=replace(current_page.published_content::text,to_jsonb(original)::text,to_jsonb(revised)::text);
 if draft_text is distinct from current_page.draft_content::text or published_text is distinct from current_page.published_content::text then
  update public.site_pages set draft_content=draft_text::jsonb,published_content=published_text::jsonb,revision=revision+1,updated_at=clock_timestamp(),published_at=clock_timestamp() where slug='home';
 end if;
end;
$copy$;

-- Atomic catalog assertions: failed checks abort migration; fixtures roll back.
do $test$
declare
 cat jsonb; saved jsonb; updated jsonb; cookie_id bigint; pop_id bigint; cookie_time timestamptz;
 batch jsonb; single_item jsonb; contents jsonb; listed jsonb; mystery jsonb; p jsonb; result jsonb; rejected boolean;
begin
 begin
 cat=private.bonbons_flexible_catalog('category_create','{"slug":"qa-cookies","name":"QA Cookies rollback","treat_type":"other","sort_order":60}'::jsonb);
 if cat->>'treatType'<>'other' then raise exception 'Custom category type missing'; end if;
 rejected=false;
 begin perform private.bonbons_flexible_catalog('category_create','{"slug":"qa-duplicate","name":" qa cookies ROLLBACK ","treat_type":"other","sort_order":60}'::jsonb); exception when unique_violation then rejected=true; end;
 if not rejected then raise exception 'Duplicate normalized category allowed'; end if;
 batch='{"slug":"qa-dozen-cookies","name":"QA dozen small cookies","category":"qa-cookies","price":18,"unit_count":12,"unit_label":"small cookies","stock_quantity":3,"low_stock_threshold":1,"active":false,"bundle_eligible":false,"ingredients":"QA recipe only"}'::jsonb;
 saved=private.bonbons_flexible_catalog('menu_create',jsonb_build_object('product',batch));
 cookie_id=(saved->>'id')::bigint; cookie_time=(saved->>'updated_at')::timestamptz;
 if saved->>'unit'<>'per batch of 12 small cookies' or saved->>'category_label'<>'QA Cookies rollback' then raise exception 'Batch or category label was not saved'; end if;
 rejected=false;
 begin perform private.bonbons_flexible_catalog('menu_create',jsonb_build_object('product',jsonb_set(jsonb_set(batch,'{slug}','"qa-bad-bundle"'),'{bundle_eligible}','true'))); exception when check_violation or invalid_parameter_value then rejected=true; end;
 if not rejected then raise exception 'A batch was marked offer eligible'; end if;
 rejected=false;
 begin perform private.bonbons_flexible_catalog('menu_create',jsonb_build_object('product',jsonb_set(jsonb_set(batch,'{slug}','"qa-bad-category"'),'{category}','"unknown-category"'))); exception when invalid_parameter_value then rejected=true; end;
 if not rejected then raise exception 'Unknown category accepted'; end if;
 updated=private.bonbons_flexible_catalog('menu_update',jsonb_build_object('id',cookie_id,'expectedUpdatedAt',cookie_time,'product',jsonb_set(batch,'{price}','20')));
 rejected=false;
 begin perform private.bonbons_flexible_catalog('menu_update',jsonb_build_object('id',cookie_id,'expectedUpdatedAt',cookie_time,'product',batch)); exception when serialization_failure then rejected=true; end;
 if not rejected then raise exception 'Stale product update accepted'; end if;
 single_item='{"slug":"qa-single-pop","name":"QA single pop","category":"everyday","price":3,"unit_count":1,"unit_label":"treats","active":false,"bundle_eligible":true}'::jsonb;
 result=private.bonbons_flexible_catalog('menu_create',jsonb_build_object('product',single_item)); pop_id=(result->>'id')::bigint;
 perform private.bonbons_flexible_catalog('update_treat_settings','{"single_pop_price":3.5,"treat_pair_price":5,"four_pack_price":10}'::jsonb);
 if (select price from public.products where id=cookie_id)<>20 or (select price from public.products where id=pop_id)<>3.5 then raise exception 'Headline prices changed a batch'; end if;
 cat=private.bonbons_flexible_catalog('category_update',jsonb_build_object('slug','qa-cookies','name','QA Cookie Batches','treat_type','other','sort_order',55,'expectedUpdatedAt',cat->>'updatedAt'));
 if not exists(select 1 from jsonb_array_elements(private.bonbons_flexible_catalog('menu_list','{}'::jsonb)) i where i->>'slug'='qa-dozen-cookies' and i->>'category_label'='QA Cookie Batches') then raise exception 'Renaming a category stranded its products'; end if;
 contents='[{"slug":"qa-dozen-cookies","name":"Forged title","qty":2,"unit_count":1},{"slug":"qa-single-pop","qty":3}]'::jsonb;
 p=jsonb_build_object('slug','qa-listed-box','title','QA Listed box','price',25,'stock_quantity',4,'low_stock_threshold',2,'active',false,'featured',false,'box_type','listed','items',contents);
 listed=private.bonbons_flexible_catalog('create_weekly_box',p);
 if (listed->>'treat_count')::integer<>27 or listed#>>'{items,0,name}'<>'QA dozen small cookies' or (listed#>>'{items,0,unit_count}')::integer<>12 then raise exception 'Listed box did not use real selling quantities'; end if;
 p=jsonb_set(jsonb_set(jsonb_set(p,'{slug}','"qa-mystery-box"'),'{box_type}','"mystery"'),'{treat_count}','27');
 mystery=private.bonbons_flexible_catalog('create_weekly_box',p);
 if jsonb_array_length(mystery->'items')<>2 or not exists(select 1 from public.weekly_boxes w where w.id=(mystery->>'id')::bigint and w.items='[]'::jsonb and w.treat_count=27) then raise exception 'Mystery contents exposed or not saved privately'; end if;
 if not exists(select 1 from private.weekly_box_contents c where c.box_id=(mystery->>'id')::bigint and jsonb_array_length(c.items)=2) then raise exception 'Staff contents missing'; end if;
 if not exists(select 1 from jsonb_array_elements(private.bonbons_flexible_catalog('list_weekly_boxes','{}'::jsonb)) w where w->>'slug'='qa-mystery-box' and jsonb_array_length(w->'items')=2) then raise exception 'Admin cannot see mystery contents'; end if;
 rejected=false;
 begin perform private.bonbons_flexible_catalog('create_weekly_box',jsonb_set(jsonb_set(p,'{slug}','"qa-wrong-count"'),'{treat_count}','10')); exception when invalid_parameter_value then rejected=true; end;
 if not rejected then raise exception 'Mystery count mismatch allowed'; end if;
 result=private.bonbons_flexible_catalog('create_weekly_box',jsonb_set(jsonb_set(jsonb_set(p,'{slug}','"qa-variable-mystery"'),'{items}','[]'),'{treat_count}','12'));
 if (result->>'treat_count')::integer<>12 then raise exception 'Variable mystery box not saved'; end if;
 rejected=false;
 begin perform private.bonbons_flexible_catalog('update_weekly_box',p||jsonb_build_object('id',mystery->>'id','expectedUpdatedAt','2000-01-01T00:00:00Z')); exception when serialization_failure then rejected=true; end;
 if not rejected then raise exception 'Stale box update accepted'; end if;
 updated=private.bonbons_flexible_catalog('update_weekly_box',jsonb_set(p,'{box_type}','"listed"')||jsonb_build_object('id',mystery->>'id','expectedUpdatedAt',mystery->>'updated_at'));
 if not exists(select 1 from public.weekly_boxes w where w.id=(updated->>'id')::bigint and jsonb_array_length(w.items)=2 and w.box_type='listed') then raise exception 'Listed conversion did not reveal exact contents'; end if;
 if has_table_privilege('anon','private.weekly_box_contents','SELECT') or has_function_privilege('anon','private.bonbons_flexible_catalog(text,jsonb)','EXECUTE') or has_table_privilege('anon','public.menu_categories','INSERT') then raise exception 'Catalog privileges are too broad'; end if;
 rejected=false;
 begin perform public.bonbons_admin('invalid-token','category_create','{}'::jsonb); exception when invalid_authorization_specification then rejected=true; end;
 if not rejected then raise exception 'Public token guard bypassed'; end if;
 raise exception 'Rollback catalog assertion fixtures' using errcode='P9999';
 exception when sqlstate 'P9999' then null;
 end;
end
$test$;
