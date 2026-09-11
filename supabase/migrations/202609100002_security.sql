-- Apply after 202609100001. Transactional; does not delete commercial data.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Revoked sessions and banned/deleted accounts lose privileges even before JWT expiry.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admin_users a
    join auth.users u on u.id = a.user_id
    join auth.sessions s on s.user_id = u.id
    where a.user_id = (select auth.uid())
      and s.id::text = (select auth.jwt()->>'session_id')
      and (u.banned_until is null or u.banned_until <= now())
      and (s.not_after is null or s.not_after > now())
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  resource text not null,
  resource_id text not null,
  changed_fields text[] not null default '{}',
  before_values jsonb not null default '{}',
  after_values jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from public, anon, authenticated;
grant select on public.admin_audit_log to authenticated;
create policy admin_audit_read on public.admin_audit_log for select to authenticated using ((select public.is_admin()));
create index audit_created on public.admin_audit_log(created_at desc);
create function private.audit_change() returns trigger language plpgsql security definer set search_path = '' as $$
declare old_data jsonb := '{}'; new_data jsonb := '{}'; fields text[]; safe_old jsonb; safe_new jsonb;
begin
  if TG_OP <> 'INSERT' then old_data := to_jsonb(old); end if;
  if TG_OP <> 'DELETE' then new_data := to_jsonb(new); end if;
  select coalesce(array_agg(k), '{}') into fields from (
    select key k from jsonb_each(old_data || new_data)
    where old_data->key is distinct from new_data->key
  ) x;
  -- Whitelist values: never copy contact fields, free text, media locations or tokens.
  select coalesce(jsonb_object_agg(key,value), '{}') into safe_old from jsonb_each(old_data)
    where key in ('price_cents','stock','status','active','total_cents');
  select coalesce(jsonb_object_agg(key,value), '{}') into safe_new from jsonb_each(new_data)
    where key in ('price_cents','stock','status','active','total_cents');
  insert into public.admin_audit_log(actor_id,action,resource,resource_id,changed_fields,before_values,after_values)
  values(auth.uid(),TG_OP,TG_TABLE_NAME,coalesce(new_data->>'id',old_data->>'id',new_data->>'product_id',old_data->>'product_id',new_data->>'key',old_data->>'key',new_data->>'user_id',old_data->>'user_id'),fields,safe_old,safe_new);
  return coalesce(new,old);
end;
$$;
revoke all on function private.audit_change() from public, anon, authenticated;
do $$ declare t text; begin
  foreach t in array array['admin_users','categories','products','product_variants','product_images','instructional_courses','instructional_modules','instructional_media','site_settings','orders'] loop
    execute format('create trigger security_audit after insert or update or delete on public.%I for each row execute function private.audit_change()',t);
  end loop;
end $$;

-- Keep the proven stock/price transaction, but make its unguarded entry private.
alter function public.create_order(uuid,jsonb,jsonb) rename to create_order_internal;
alter function public.create_order_internal(uuid,jsonb,jsonb) set schema private;
revoke all on function private.create_order_internal(uuid,jsonb,jsonb) from public, anon, authenticated;
create index orders_email_created on public.orders(email,created_at desc);
create function public.create_order(p_key uuid,p_customer jsonb,p_items jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_email text;
begin
  if p_key is null or p_customer is null or jsonb_typeof(p_customer) <> 'object'
    or p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'INVALID_ORDER'; end if;
  if octet_length(p_customer::text) > 12000 or octet_length(p_items::text) > 24000 then raise exception 'INVALID_ORDER'; end if;
  if jsonb_array_length(p_items) not between 1 and 50 then raise exception 'INVALID_ITEMS'; end if;
  v_email := lower(trim(p_customer->>'email'));
  if v_email is null or length(v_email)>254 then raise exception 'INVALID_ORDER'; end if;
  if exists(select 1 from jsonb_array_elements(p_items) x where coalesce(x->>'quantity','') !~ '^[1-9][0-9]?$') then raise exception 'INVALID_QUANTITY'; end if;
  if exists(select 1 from jsonb_array_elements(p_items) x where
    jsonb_typeof(x) <> 'object' or coalesce(x->>'variant_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or coalesce(x->>'quantity','') !~ '^[1-9][0-9]?$'
    or (x ? 'expected_price_cents' and (jsonb_typeof(x->'expected_price_cents') <> 'number' or (x->>'expected_price_cents') !~ '^[0-9]{1,9}$'))
  ) then raise exception 'INVALID_ITEMS'; end if;
  -- Global serialization makes these quotas race-safe, including direct RPC calls.
  perform pg_advisory_xact_lock(720260910002::bigint);
  if exists(select 1 from public.orders where request_key=p_key) then
    return private.create_order_internal(p_key,p_customer,p_items);
  end if;
  if (select count(*) from public.orders where created_at>now()-interval '1 hour') >= 100
    or (select count(*) from public.orders where email=v_email and created_at>now()-interval '1 hour') >= 5
    or (select count(*) from public.orders where email=v_email and status='pending') >= 3
  then raise exception 'ORDER_RATE_LIMIT'; end if;
  return private.create_order_internal(p_key,p_customer,p_items);
end;
$$;
revoke all on function public.create_order(uuid,jsonb,jsonb) from public;
grant execute on function public.create_order(uuid,jsonb,jsonb) to anon, authenticated;

-- Reject new invalid data without rewriting existing records.
alter table public.products add constraint products_slug_length check(length(slug)<=180) not valid;
alter table public.categories add constraint categories_slug_length check(length(slug)<=100) not valid;
alter table public.product_images add constraint images_url_length check(length(url)<=2000) not valid;
alter table public.product_images add constraint images_position_limit check(position<=10000) not valid;
alter table public.instructional_modules add constraint modules_position_limit check(position<=10000) not valid;

-- Storage enforces path, MIME allowlist and size; file contents also checked in UI.
drop policy admin_image_upload on storage.objects;
drop policy admin_image_update on storage.objects;
create policy admin_image_upload on storage.objects for insert to authenticated with check (
  bucket_id='product-images' and (select public.is_admin())
  and name ~* '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
  and exists(select 1 from public.products p where p.id::text=split_part(storage.objects.name,'/',1))
);
create policy admin_image_update on storage.objects for update to authenticated
using(bucket_id='product-images' and (select public.is_admin()))
with check(bucket_id='product-images' and (select public.is_admin())
  and name ~* '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
  and exists(select 1 from public.products p where p.id::text=split_part(storage.objects.name,'/',1)));
update storage.buckets set file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'] where id='product-images';
commit;
