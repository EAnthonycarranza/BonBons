-- All fixtures and edits are rolled back. No customer records or emails.
begin;
do $test$
declare
  old_page public.site_pages%rowtype;
  saved jsonb;
  product jsonb;
  changes jsonb;
begin
  select * into old_page from public.site_pages where slug='home';
  changes=jsonb_set(old_page.draft_content,'{title}','"Private QA draft"'::jsonb);
  saved=private.bonbons_catalog_pages('page_save',jsonb_build_object('slug','home','revision',old_page.revision,'content',changes));
  if saved->'published_content' is distinct from old_page.published_content then raise exception 'Saving a draft changed the public page'; end if;
  if saved->'draft_content'->>'title'<>'Private QA draft' then raise exception 'Draft was not saved'; end if;
  begin
    perform private.bonbons_catalog_pages('page_publish',jsonb_build_object('slug','home','revision',old_page.revision,'content',changes));
    raise exception 'Stale editor overwrote newer content';
  exception when serialization_failure then null;
  end;
  saved=private.bonbons_catalog_pages('page_publish',jsonb_build_object('slug','home','revision',old_page.revision+1,'content',changes));
  if saved->'published_content'->>'title'<>'Private QA draft' then raise exception 'Publish did not update the public page'; end if;
  begin
    perform public.bonbons_admin('not-an-authorized-token','page_list','{}');
    raise exception 'Unauthenticated page access was accepted';
  exception when invalid_authorization_specification then null;
  end;
  product=private.bonbons_catalog_pages('menu_create',jsonb_build_object('product',jsonb_build_object('name','Transactional QA rice treat','slug','transactional-qa-rice-treat','price',3,'active',false,'bundle_eligible',true,'category','rice-crispy-treats','stock_quantity',3,'allergens',jsonb_build_array('wheat'))));
  if product->>'category'<>'rice-crispy-treats' or (product->>'price')::numeric<>3 then raise exception 'New category or price was lost'; end if;
  changes=jsonb_set(product,'{price}','4'::jsonb);
  changes=jsonb_set(changes,'{bundle_eligible}','false'::jsonb);
  saved=private.bonbons_catalog_pages('menu_update',jsonb_build_object('id',product->>'id','expectedUpdatedAt',product->>'updated_at','product',changes));
  if (saved->>'price')::numeric<>4 or not (saved->>'bundle_eligible')::boolean then raise exception 'Individual price or all-flavor offer rule was lost'; end if;
  begin
    perform private.bonbons_catalog_pages('menu_update',jsonb_build_object('id',product->>'id','expectedUpdatedAt',product->>'updated_at','product',changes));
    raise exception 'Stale product edit was accepted';
  exception when serialization_failure then null;
  end;
  saved=private.bonbons_catalog_pages('update_treat_settings','{"single_pop_price":3.5,"treat_pair_price":6}'::jsonb);
  if (saved->>'treat_pair_price')::numeric<>6 then raise exception 'Two-treat settings not saved'; end if;
  if (select price from public.products where id=(product->>'id')::bigint)<>3.5 then raise exception 'Saving the menu price did not update all flavors'; end if;
  if exists(select 1 from public.products where not bundle_eligible) then raise exception 'An old exclusion blocked a flavor'; end if;
  if not has_column_privilege('anon','public.site_pages','published_content','select') then raise exception 'Public page access is missing'; end if;
  if has_column_privilege('anon','public.site_pages','draft_content','select') or has_table_privilege('anon','public.site_pages','update') then raise exception 'Draft or page writes are exposed'; end if;
  if has_function_privilege('anon','private.bonbons_catalog_pages(text,jsonb)','execute') or has_function_privilege('anon','private.bonbons_admin_legacy(text,text,jsonb)','execute') then raise exception 'Private dispatch is callable'; end if;
end;
$test$;
set local role anon;
select slug,published_content->>'title' as public_title from public.site_pages order by slug;
reset role;
rollback;
