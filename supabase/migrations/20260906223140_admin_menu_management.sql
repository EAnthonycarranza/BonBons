-- Recoverable menu deletion; existing orders retain their item snapshots.
alter table public.products add column if not exists deleted_at timestamptz;
alter table public.products add column if not exists source_url text not null default '';

drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products for select to anon, authenticated
  using (active = true and deleted_at is null);
-- Existing public-read-only and service-role-only write grants remain unchanged.

-- Only authenticated server code can upload. Public reads serve product photos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-photos', 'menu-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
