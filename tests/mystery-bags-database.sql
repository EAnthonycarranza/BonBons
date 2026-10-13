-- All fixtures roll back; no orders, customer emails, or real products are changed.
begin;
do $test$
declare draft jsonb; saved jsonb; updated jsonb; rejected boolean;
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
end;
$test$;
rollback;
