-- PanCoon private kitchen foundation.
-- Apply ONLY in a dedicated PanCoon Supabase project, never an unrelated app.
-- Publishable browser keys are safe; service-role/secret keys must never be shipped.
-- This schema is intentionally single-owner per kitchen for the first release.
-- Household sharing will require a separately reviewed membership model.

begin;

create table if not exists public.pancoon_kitchens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  snapshot jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.pancoon_kitchens enable row level security;
revoke all on public.pancoon_kitchens from public, anon;
grant select, insert, update, delete on public.pancoon_kitchens to authenticated;

drop policy if exists "pancoon_read_own_kitchen" on public.pancoon_kitchens;
create policy "pancoon_read_own_kitchen"
on public.pancoon_kitchens for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "pancoon_create_own_kitchen" on public.pancoon_kitchens;
create policy "pancoon_create_own_kitchen"
on public.pancoon_kitchens for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "pancoon_update_own_kitchen" on public.pancoon_kitchens;
create policy "pancoon_update_own_kitchen"
on public.pancoon_kitchens for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "pancoon_delete_own_kitchen" on public.pancoon_kitchens;
create policy "pancoon_delete_own_kitchen"
on public.pancoon_kitchens for delete to authenticated
using (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pancoon-private-media', 'pancoon-private-media', false,
  15728640, array['image/png','image/jpeg','image/webp','image/gif']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Every object lives under exactly its owner's UUID folder.
-- storage.objects RLS is enabled by Supabase Storage.
drop policy if exists "pancoon_read_own_media" on storage.objects;
create policy "pancoon_read_own_media"
on storage.objects for select to authenticated
using (
  bucket_id = 'pancoon-private-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "pancoon_upload_own_media" on storage.objects;
create policy "pancoon_upload_own_media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'pancoon-private-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "pancoon_update_own_media" on storage.objects;
create policy "pancoon_update_own_media"
on storage.objects for update to authenticated
using (
  bucket_id = 'pancoon-private-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'pancoon-private-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "pancoon_delete_own_media" on storage.objects;
create policy "pancoon_delete_own_media"
on storage.objects for delete to authenticated
using (
  bucket_id = 'pancoon-private-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

commit;

-- After applying, verify:
-- 1. Both anonymous role SELECT queries return no kitchen rows.
-- 2. User A can read only user A's kitchen; user B cannot read A's.
-- 3. User A can upload/download under A's UUID folder, but not B's.
-- 4. Bucket public = false and anonymous object requests fail.
-- 5. Run Supabase Security Advisors and resolve issues before production.
