-- Pretzel rods join the menu as their own category, priced on their own terms:
-- $3 each or 2 for $5, against the cake pops' 4 for $10.
--
-- The two prices live in shop_settings beside the cake-pop pair rather than in
-- page copy, so the owner can move them from Shop settings the same way.

alter table public.shop_settings
  add column if not exists pretzel_rod_price numeric(10, 2) not null default 3,
  add column if not exists pretzel_pair_price numeric(10, 2) not null default 5;

comment on column public.shop_settings.pretzel_rod_price is
  'Headline price for a single pretzel rod. Specialty rods carry their own price on the product row.';
comment on column public.shop_settings.pretzel_pair_price is
  'What two bundle-eligible pretzel rods cost together.';

-- Starter rods so the category is not an empty shelf. Names and photos are
-- placeholders for the owner to edit in the Shop Desk; the specialty rod is
-- deliberately not bundle-eligible, which is what keeps it out of the 2-for-$5
-- maths while still sitting on the same shelf.
insert into public.products
  (slug, name, blurb, description, price, unit, bundle_eligible, icon, color, tint,
   category, lead_time_hours, allergens, active, sort_order)
values
  ('chocolate-drizzle-pretzel-rod', 'Chocolate Drizzle Pretzel Rod',
   'Dipped in chocolate and finished with a drizzle.',
   'A full-length pretzel rod dipped in chocolate and finished with a contrasting drizzle. Salty and sweet in the same bite.',
   3, 'each', true, 'i-krispie', '#8C5636', '140,86,54', 'pretzel-rods', 72,
   array['wheat', 'milk', 'soy'], true, 10),
  ('sprinkle-pretzel-rod', 'Sprinkle Pretzel Rod',
   'Chocolate-dipped and rolled in celebration sprinkles.',
   'A chocolate-dipped rod rolled in bright celebration sprinkles. The one that disappears first at a party.',
   3, 'each', true, 'i-krispie', '#FF2E9A', '255,46,154', 'pretzel-rods', 72,
   array['wheat', 'milk', 'soy'], true, 20),
  ('white-chocolate-pretzel-rod', 'White Chocolate Pretzel Rod',
   'White chocolate, with a little colour on top.',
   'Dipped in white chocolate and finished with coloured sugar. Easy to match to a theme.',
   3, 'each', true, 'i-krispie', '#F6E3C8', '246,227,200', 'pretzel-rods', 72,
   array['wheat', 'milk', 'soy'], true, 30),
  ('specialty-pretzel-rod', 'Specialty Pretzel Rod',
   'A loaded rod - candy, cookie crumb or a double dip.',
   'The dressed-up rod: a double dip, crushed cookie or candy topping, made to match your colours. Priced on its own and not part of the 2-for deal.',
   4, 'each', false, 'i-krispie', '#A55CFF', '165,92,255', 'pretzel-rods', 72,
   array['wheat', 'milk', 'soy'], true, 40)
on conflict (slug) do nothing;
