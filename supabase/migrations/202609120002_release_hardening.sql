-- Release Candidate: ejecutar en staging y respaldar antes de aplicar en producción.
-- No borra ni reescribe datos comerciales. Si un CHECK detecta datos antiguos
-- incompatibles, toda la transacción falla y deben revisarse esas filas.
begin;

-- Retirar permisos heredados por default privileges (TRUNCATE no usa RLS).
revoke all on public.academy_photos from public, anon, authenticated;
grant select on public.academy_photos to anon, authenticated;
grant insert, update, delete on public.academy_photos to authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;

alter function public.create_order(uuid,jsonb,jsonb) rename to create_order_with_quotas;
alter function public.create_order_with_quotas(uuid,jsonb,jsonb) set schema private;
revoke all on function private.create_order_with_quotas(uuid,jsonb,jsonb) from public, anon, authenticated;
create function public.create_order(p_key uuid,p_customer jsonb,p_items jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if p_key is null or p_customer is null or p_items is null
    or jsonb_typeof(p_customer)<>'object' or jsonb_typeof(p_items)<>'array'
    or octet_length(p_customer::text)>12000 or octet_length(p_items::text)>24000
  then raise exception 'INVALID_ORDER'; end if;
  if not (p_customer ?& array['name','email','phone','delivery_method'])
    or exists(select 1 from jsonb_each(p_customer) x where x.key not in ('name','email','phone','delivery_method','notes') or jsonb_typeof(x.value)<>'string')
  then raise exception 'INVALID_ORDER'; end if;
  if exists(select 1 from jsonb_array_elements(p_items) x where jsonb_typeof(x)<>'object')
  then raise exception 'INVALID_ITEMS'; end if;
  if exists(select 1 from jsonb_array_elements(p_items) x, jsonb_object_keys(x) k where k not in ('variant_id','quantity','expected_price_cents'))
    or exists(select 1 from jsonb_array_elements(p_items) x where jsonb_typeof(x->'quantity') is distinct from 'number' or jsonb_typeof(x->'variant_id') is distinct from 'string')
  then raise exception 'INVALID_ITEMS'; end if;
  return private.create_order_with_quotas(p_key,p_customer,p_items);
end;
$$;
revoke all on function public.create_order(uuid,jsonb,jsonb) from public;
grant execute on function public.create_order(uuid,jsonb,jsonb) to anon, authenticated;

drop policy public_settings on public.site_settings;
create policy public_settings on public.site_settings for select to anon, authenticated
using(key in ('schedule','address','bank_transfer'));

alter table public.products validate constraint products_slug_length;
alter table public.categories validate constraint categories_slug_length;
alter table public.product_images validate constraint images_url_length;
alter table public.product_images validate constraint images_position_limit;
alter table public.instructional_modules validate constraint modules_position_limit;

alter table public.instructional_delivery_settings add constraint drive_url_exact
check(drive_url ~ '^https://drive[.]google[.]com/(file/d/|drive/folders/)[A-Za-z0-9_-]+(/view)?/?([?][^[:space:]#]*)?(#[^[:space:]]*)?$');
alter table public.academy_photos add constraint academy_url_https
check(url ~ '^https://[^/[:space:]@]+/storage/v1/object/public/academy-images/[0-9a-f-]{36}[.](jpg|png|webp)$');

-- Las variantes referenciadas por pedidos no deben cambiar de producto.
create function private.guard_variant_product() returns trigger language plpgsql set search_path='' as $$
begin
  if new.product_id is distinct from old.product_id then raise exception 'VARIANT_PRODUCT_IMMUTABLE'; end if;
  return new;
end;
$$;
revoke all on function private.guard_variant_product() from public, anon, authenticated;
create trigger guard_variant_product before update on public.product_variants for each row execute function private.guard_variant_product();

-- Datos bancarios válidos también ante llamadas directas a REST.
create function private.validate_bank_setting() returns trigger language plpgsql set search_path='' as $$
declare v jsonb;
begin
  if new.key <> 'bank_transfer' then return new; end if;
  begin v := new.value::jsonb; exception when others then raise exception 'INVALID_BANK_SETTINGS'; end;
  if jsonb_typeof(v) <> 'object' or not (v ?& array['bank','account_type','account_number','identification','holder'])
    or exists(select 1 from jsonb_each(v) x where x.key not in ('bank','account_type','account_number','identification','holder') or jsonb_typeof(x.value)<>'string')
    or length(trim(v->>'bank')) not between 1 and 120
    or length(trim(v->>'holder')) not between 1 and 180
    or v->>'account_type' not in ('Ahorros','Corriente')
    or v->>'account_number' !~ '^[0-9]{5,30}$'
    or v->>'identification' !~ '^[0-9]{10}([0-9]{3})?$'
  then raise exception 'INVALID_BANK_SETTINGS'; end if;
  return new;
end;
$$;
revoke all on function private.validate_bank_setting() from public, anon, authenticated;
create trigger validate_bank_setting before insert or update on public.site_settings for each row execute function private.validate_bank_setting();

-- Si el administrador ha activado MFA, una contraseña sola ya no basta,
-- ni siquiera al invocar REST, RPC o Storage fuera de la interfaz.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from public.admin_users a
    join auth.users u on u.id=a.user_id
    join auth.sessions s on s.user_id=u.id
    where a.user_id=(select auth.uid())
      and s.id::text=(select auth.jwt()->>'session_id')
      and (u.banned_until is null or u.banned_until<=now())
      and (s.not_after is null or s.not_after>now())
      and ((select auth.jwt()->>'aal')='aal2' or not exists(
        select 1 from auth.mfa_factors f where f.user_id=u.id and f.status='verified'
      ))
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
commit;
