begin;
create table public.academy_photos (
  id uuid primary key default gen_random_uuid(),
  url text not null check(length(url) between 1 and 2000),
  alt text not null default 'Entrenamiento en Team Vivas Academy' check(length(alt) between 1 and 250),
  created_at timestamptz not null default now()
);
alter table public.academy_photos enable row level security;
grant select on public.academy_photos to anon, authenticated;
grant insert, update, delete on public.academy_photos to authenticated;
create policy public_academy_photos on public.academy_photos for select to anon, authenticated using(true);
create policy admin_academy_photos on public.academy_photos for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create trigger audit_academy_photos after insert or update or delete on public.academy_photos for each row execute function private.audit_change();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('academy-images','academy-images',true,5242880,array['image/jpeg','image/png','image/webp']);
create policy public_academy_images on storage.objects for select to anon, authenticated using(bucket_id='academy-images');
create policy admin_academy_image_upload on storage.objects for insert to authenticated with check(
  bucket_id='academy-images' and (select public.is_admin()) and name ~* '^[0-9a-f-]{36}\.(jpg|png|webp)$'
);
create policy admin_academy_image_delete on storage.objects for delete to authenticated using(bucket_id='academy-images' and (select public.is_admin()));
commit;
