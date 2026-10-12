-- Every available flavor can join the same two-treat offer. Preserve single
-- prices, visibility, inventory, and existing orders.
alter table public.products alter column bundle_eligible set default true;
update public.products set bundle_eligible=true where not bundle_eligible;

create or replace function private.include_every_treat_flavor()
returns trigger language plpgsql security invoker set search_path='' as $function$
begin
  new.bundle_eligible=true;
  return new;
end;
$function$;
revoke all on function private.include_every_treat_flavor() from public,anon,authenticated,service_role;
create trigger every_treat_flavor_in_pair before insert or update on public.products
for each row execute function private.include_every_treat_flavor();

-- Update only the original offer copy, keeping other saved website edits.
do $copy$
declare
  item jsonb;
  replacement jsonb;
  current_page public.site_pages%rowtype;
  draft_text text;
  published_text text;
  replacements jsonb := '[["for any two regular treats", "for any two flavors"], ["two regular treats", "any two flavors"], ["Choose a regular treat for {singlePrice}, or mix any two eligible treats for {pairPrice}. Specialty treats are priced individually.", "Choose a regular treat for {singlePrice}, or mix any two available flavors for {pairPrice}. Individual prices are listed in the shop."], ["A cake pop and a pretzel rod? Two dipped Oreos? Choose any two regular treats across our menu and make a mix that is completely yours.", "A cake pop and a pretzel rod? Two dipped Oreos? Choose any two available flavors across our menu and make a mix that is completely yours."], ["Regular singles are {singlePrice} each. Specialty items are priced separately.", "Choose any two flavors for {pairPrice}. Individual prices are listed in the shop."], ["Choose {singlePrice} regular singles or build a two-treat mix for {pairPrice}. Specialty items have their own prices.", "Choose a regular treat for {singlePrice} or mix any two available flavors for {pairPrice}. Individual prices are shown in the menu."]]'::jsonb;
begin
  select * into current_page from public.site_pages where slug='home' for update;
  draft_text=current_page.draft_content::text;
  published_text=current_page.published_content::text;
  for replacement in select value from jsonb_array_elements(replacements) loop
    draft_text=replace(draft_text,to_jsonb(replacement->>0)::text,to_jsonb(replacement->>1)::text);
    published_text=replace(published_text,to_jsonb(replacement->>0)::text,to_jsonb(replacement->>1)::text);
  end loop;
  if draft_text::jsonb is distinct from current_page.draft_content or published_text::jsonb is distinct from current_page.published_content then
    update public.site_pages set draft_content=draft_text::jsonb,
      published_content=published_text::jsonb,revision=revision+1,updated_at=now(),published_at=now()
    where slug='home';
  end if;
end;
$copy$;
