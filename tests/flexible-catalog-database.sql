-- Transactional fixtures only: no emails, real products, or live box changes persist.
begin;
do $test$
declare
 cat jsonb; saved jsonb; updated jsonb; cookie_id bigint; pop_id bigint; cookie_time timestamptz;
 batch jsonb; single_item jsonb; contents jsonb; listed jsonb; mystery jsonb; p jsonb; result jsonb; rejected boolean;
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
end
$test$;
rollback;
select 'Categories, batch pricing, concurrency, mixed boxes and mystery privacy passed; fixtures rolled back' as result;
