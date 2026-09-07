-- Named flavors were verified on the owner's Instagram on 2026-09-06.
-- Only the three requested flavors are live. Historical rotations are hidden
-- until the owner confirms their current availability and allergen details.
insert into public.products
  (slug, name, blurb, description, price, unit, bundle_eligible, active, sort_order, source_url)
values
  ('cookie-monster', 'Cookie Monster', 'A single handmade cake pop', 'Handmade by Bon Bon''s. Availability and pickup are confirmed with your request. Please ask about ingredients and allergens before ordering.', 4, 'each', true, true, 10, 'https://www.instagram.com/p/Dc1HQZ3y5On/'),
  ('strawberry-shortcake', 'Strawberry Shortcake', 'A single handmade cake pop', 'Handmade by Bon Bon''s. Availability and pickup are confirmed with your request. Please ask about ingredients and allergens before ordering.', 4, 'each', true, true, 20, 'https://www.instagram.com/p/Dc1HQZ3y5On/'),
  ('biscoff', 'Biscoff', 'A single handmade cake pop', 'Handmade by Bon Bon''s. Availability and pickup are confirmed with your request. Please ask about ingredients and allergens before ordering.', 4, 'each', true, true, 30, 'https://www.instagram.com/p/DcjwPNXTs4b/'),
  ('cookies-and-cream', 'Cookies & Cream', 'A single handmade cake pop', 'Handmade by Bon Bon''s. Availability and pickup are confirmed with your request. Please ask about ingredients and allergens before ordering.', 4, 'each', true, false, 40, 'https://www.instagram.com/p/DcjwPNXTs4b/'),
  ('cosmic-brownie', 'Cosmic Brownie', 'A single handmade cake pop', 'Handmade by Bon Bon''s. Availability and pickup are confirmed with your request. Please ask about ingredients and allergens before ordering.', 4, 'each', true, false, 50, 'https://www.instagram.com/p/DcjwPNXTs4b/'),
  ('strawberry-crunch', 'Strawberry Crunch', 'A single handmade cake pop', 'Handmade by Bon Bon''s. Availability and pickup are confirmed with your request. Please ask about ingredients and allergens before ordering.', 4, 'each', true, false, 60, 'https://www.instagram.com/p/DcjwPNXTs4b/'),
  ('fruity-pebbles', 'Fruity Pebbles', 'A single handmade cake pop', 'Handmade by Bon Bon''s. Availability and pickup are confirmed with your request. Please ask about ingredients and allergens before ordering.', 4, 'each', true, false, 70, 'https://www.instagram.com/p/DcjwPNXTs4b/'),
  ('nutty-buddy', 'Nutty Buddy', 'A single handmade cake pop', 'Handmade by Bon Bon''s. Availability and pickup are confirmed with your request. Please ask about ingredients and allergens before ordering.', 4, 'each', true, false, 80, 'https://www.instagram.com/p/DcjwPNXTs4b/'),
  ('almond-joy', 'Almond Joy', 'A single handmade cake pop', 'Handmade by Bon Bon''s. Availability and pickup are confirmed with your request. Please ask about ingredients and allergens before ordering.', 4, 'each', true, false, 90, 'https://www.instagram.com/p/DcjwPNXTs4b/'),
  ('ube-halaya', 'Ube Halaya', 'A single handmade cake pop', 'Handmade by Bon Bon''s. Availability and pickup are confirmed with your request. Please ask about ingredients and allergens before ordering.', 4, 'each', true, false, 100, 'https://www.instagram.com/p/DcjwPNXTs4b/'),
  ('ube-coconut', 'Ube Coconut', 'A single handmade cake pop', 'Handmade by Bon Bon''s. Availability and pickup are confirmed with your request. Please ask about ingredients and allergens before ordering.', 4, 'each', true, false, 110, 'https://www.instagram.com/p/DcjwPNXTs4b/'),
  ('funfetti', 'Funfetti', 'A single handmade cake pop', 'Handmade by Bon Bon''s. Availability and pickup are confirmed with your request. Please ask about ingredients and allergens before ordering.', 4, 'each', true, false, 120, 'https://www.instagram.com/p/DcO--umDxWh/'),
  ('birthday-cake', 'Birthday Cake', 'A single handmade cake pop', 'Handmade by Bon Bon''s. Availability and pickup are confirmed with your request. Please ask about ingredients and allergens before ordering.', 4, 'each', true, false, 130, 'https://www.instagram.com/p/DcO--umDxWh/'),
  ('strawberry-cheesecake', 'Strawberry Cheesecake', 'A single handmade cake pop', 'Handmade by Bon Bon''s. Availability and pickup are confirmed with your request. Please ask about ingredients and allergens before ordering.', 4, 'each', true, false, 140, 'https://www.instagram.com/p/DcO--umDxWh/'),
  ('walnut-brownie', 'Walnut Brownie', 'A single handmade cake pop', 'Handmade by Bon Bon''s. Availability and pickup are confirmed with your request. Please ask about ingredients and allergens before ordering.', 4, 'each', true, false, 150, 'https://www.instagram.com/p/DcO--umDxWh/')
on conflict (slug) do nothing;

-- Preserve the old placeholder menu in Hidden rather than destroy it.
update public.products set active = false, updated_at = now()
where (slug, name) in (
  ('signature-cake-pops', 'Classic Cake Pop'),
  ('chocolate-drizzle-cake-pops', 'Chocolate Drizzle Pop'),
  ('sprinkle-party-cake-pops', 'Sprinkle Cake Pop'),
  ('custom-theme-cake-pops', 'Custom Color Cake Pop')
);

-- Remove only the temporary, hidden integration-test flavor created during verification.
delete from public.products where slug = 'qa-menu-1788753647506' and name = 'QA — Menu integration test' and active = false;
