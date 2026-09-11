-- Run once in the Supabase SQL editor. No existing TVA data is deleted.
begin;
create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.admin_users where user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(trim(name)) between 1 and 100),
  slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(trim(name)) between 1 and 180),
  slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '' check(length(description) <= 10000),
  category_id uuid references public.categories(id),
  kind text not null default 'physical' check(kind in ('physical','course')),
  status text not null default 'draft' check(status in ('draft','active','archived')),
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique check(length(trim(sku)) between 1 and 100),
  color text not null default '' check(length(color) <= 80),
  size text not null default '' check(length(size) <= 40),
  price_cents integer not null check(price_cents between 0 and 100000000),
  stock integer not null default 0 check(stock between 0 and 1000000),
  active boolean not null default true,
  unique(product_id, color, size),
  unique(id, product_id)
);
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid,
  url text not null check(url ~ '^https://' or url ~ '^/assets/[a-zA-Z0-9_.-]+$'),
  alt text not null default '' check(length(alt) <= 300),
  position integer not null default 0 check(position >= 0),
  is_primary boolean not null default false,
  foreign key(variant_id, product_id) references public.product_variants(id, product_id)
);
create unique index one_primary_image on public.product_images(product_id) where is_primary;
create table public.instructional_courses (
  product_id uuid primary key references public.products(id) on delete cascade,
  trainer text not null default 'Michael Vivas' check(length(trainer) <= 180),
  level text not null default 'Todos los niveles' check(length(level) <= 100),
  delivery_note text not null default 'Acceso enviado manualmente después de confirmar el pago.' check(length(delivery_note) <= 2000)
);
create table public.instructional_modules (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.instructional_courses(product_id) on delete cascade,
  title text not null check(length(trim(title)) between 1 and 180),
  description text not null default '' check(length(description) <= 3000),
  position integer not null default 0 check(position >= 0),
  foreign key(product_id) references public.products(id) on delete cascade
);
-- Paid media locations are never exposed in public catalog responses.
create table public.instructional_media (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.instructional_modules(id) on delete cascade,
  title text not null check(length(trim(title)) between 1 and 180),
  resource text not null check(length(trim(resource)) between 1 and 2000)
);
create table public.site_settings (
  key text primary key check(length(key) between 1 and 100),
  value text not null check(length(value) <= 5000)
);
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  request_key uuid not null unique,
  request_fingerprint text not null,
  customer_name text not null check(length(trim(customer_name)) between 2 and 180),
  email text not null check(length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  phone text not null check(phone ~ '^[+0-9 ()-]{7,30}$'),
  delivery_method text not null check(delivery_method in ('pickup','digital')),
  notes text not null default '' check(length(notes) <= 1000),
  status text not null default 'pending' check(status in ('pending','confirmed','fulfilled','cancelled')),
  subtotal_cents bigint not null default 0 check(subtotal_cents >= 0),
  total_cents bigint not null default 0 check(total_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  variant_id uuid not null references public.product_variants(id),
  product_name text not null,
  variant_label text not null,
  sku text not null,
  kind text not null check(kind in ('physical','course')),
  quantity integer not null check(quantity between 1 and 99),
  unit_price_cents integer not null check(unit_price_cents >= 0),
  unique(order_id, variant_id)
);
create index variants_product on public.product_variants(product_id);
create index images_product on public.product_images(product_id);
create index orders_created on public.orders(created_at desc);
create index items_order on public.order_items(order_id);
create index modules_product on public.instructional_modules(product_id);
create index media_module on public.instructional_media(module_id);

create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger products_updated before update on public.products for each row execute function public.touch_updated_at();
create trigger orders_updated before update on public.orders for each row execute function public.touch_updated_at();

create function public.validate_product_kind() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.kind <> old.kind then raise exception 'PRODUCT_KIND_IMMUTABLE'; end if;
  return new;
end;
$$;
create trigger products_kind before update on public.products for each row execute function public.validate_product_kind();
create function public.validate_digital_variant() returns trigger language plpgsql set search_path = '' as $$
begin
  if exists(select 1 from public.products where id = new.product_id and kind = 'course')
    and (new.color <> '' or new.size <> '' or new.stock <> 0) then raise exception 'INVALID_DIGITAL_VARIANT'; end if;
  return new;
end;
$$;
create trigger digital_variant before insert or update on public.product_variants for each row execute function public.validate_digital_variant();

alter table public.admin_users enable row level security;
create policy own_admin_membership on public.admin_users for select to authenticated using(user_id = (select auth.uid()));
revoke all on public.admin_users from anon, authenticated;
grant select on public.admin_users to authenticated;
do $$ declare t text; begin
  foreach t in array array['categories','products','product_variants','product_images','instructional_courses','instructional_modules','instructional_media','site_settings'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant select on public.%I to anon, authenticated',t);
    execute format('grant insert, update, delete on public.%I to authenticated',t);
    execute format('create policy admin_manage on public.%I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))',t);
  end loop;
end $$;
create policy public_categories on public.categories for select to anon, authenticated using(true);
create policy public_settings on public.site_settings for select to anon, authenticated using(true);
create policy public_products on public.products for select to anon, authenticated using(status = 'active');
create policy public_variants on public.product_variants for select to anon, authenticated using(active and exists(select 1 from public.products p where p.id = product_id and p.status = 'active'));
create policy public_images on public.product_images for select to anon, authenticated using(exists(select 1 from public.products p where p.id = product_id and p.status = 'active'));
create policy public_courses on public.instructional_courses for select to anon, authenticated using(exists(select 1 from public.products p where p.id = product_id and p.status = 'active' and p.kind = 'course'));
create policy public_modules on public.instructional_modules for select to anon, authenticated using(exists(select 1 from public.products p where p.id = product_id and p.status = 'active' and p.kind = 'course'));
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
revoke all on public.orders, public.order_items from anon, authenticated;
grant select on public.orders, public.order_items to authenticated;
create policy admin_orders on public.orders for select to authenticated using((select public.is_admin()));
create policy admin_items on public.order_items for select to authenticated using((select public.is_admin()));

-- One transaction: authoritative prices, ordered row locks, stock reservation and history.
create function public.create_order(p_key uuid, p_customer jsonb, p_items jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders%rowtype; v_line record; v_product public.products%rowtype;
  v_variant public.product_variants%rowtype; v_total bigint := 0;
  v_fingerprint text; v_count integer; v_physical boolean := false;
begin
  if p_key is null or p_customer is null or p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'INVALID_ORDER'; end if;
  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then raise exception 'INVALID_ITEMS'; end if;
  if exists(select 1 from jsonb_array_elements(p_items) x where (x->>'quantity') is null or (x->>'quantity') !~ '^[1-9][0-9]?$' or (x->>'variant_id') is null) then raise exception 'INVALID_QUANTITY'; end if;
  select count(distinct x->>'variant_id') into v_count from jsonb_array_elements(p_items) x;
  if v_count <> jsonb_array_length(p_items) then raise exception 'DUPLICATE_VARIANT'; end if;
  v_fingerprint := md5(p_customer::text || p_items::text);
  perform pg_advisory_xact_lock(hashtextextended(p_key::text, 0));
  select * into v_order from public.orders where request_key = p_key;
  if found then
    if v_order.request_fingerprint <> v_fingerprint then raise exception 'REQUEST_CONFLICT'; end if;
    return jsonb_build_object('id',v_order.id,'total_cents',v_order.total_cents,'status',v_order.status);
  end if;
  insert into public.orders(request_key,request_fingerprint,customer_name,email,phone,delivery_method,notes)
  values(p_key,v_fingerprint,trim(p_customer->>'name'),lower(trim(p_customer->>'email')),trim(p_customer->>'phone'),p_customer->>'delivery_method',coalesce(p_customer->>'notes','')) returning * into v_order;
  for v_line in select (x->>'variant_id')::uuid as id, (x->>'quantity')::integer as qty, (x->>'expected_price_cents')::integer as expected_price from jsonb_array_elements(p_items) x order by (x->>'variant_id')::uuid loop
    select * into v_variant from public.product_variants where id = v_line.id for update;
    if not found or not v_variant.active then raise exception 'VARIANT_UNAVAILABLE'; end if;
    if v_line.expected_price is not null and v_line.expected_price <> v_variant.price_cents then raise exception 'PRICE_CHANGED'; end if;
    select * into v_product from public.products where id = v_variant.product_id for share;
    if v_product.status <> 'active' then raise exception 'PRODUCT_UNAVAILABLE'; end if;
    if v_product.kind = 'physical' then
      v_physical := true;
      if v_variant.stock < v_line.qty then raise exception 'INSUFFICIENT_STOCK'; end if;
      update public.product_variants set stock = stock - v_line.qty where id = v_variant.id;
    elsif v_line.qty <> 1 then raise exception 'DIGITAL_QUANTITY';
    end if;
    insert into public.order_items(order_id,variant_id,product_name,variant_label,sku,kind,quantity,unit_price_cents)
    values(v_order.id,v_variant.id,v_product.name,concat_ws(' / ',nullif(v_variant.color,''),nullif(v_variant.size,'')),v_variant.sku,v_product.kind,v_line.qty,v_variant.price_cents);
    v_total := v_total + v_variant.price_cents::bigint * v_line.qty;
  end loop;
  if v_physical and v_order.delivery_method <> 'pickup' then raise exception 'PICKUP_REQUIRED'; end if;
  update public.orders set subtotal_cents = v_total, total_cents = v_total where id = v_order.id;
  return jsonb_build_object('id',v_order.id,'total_cents',v_total,'status','pending');
end;
$$;
revoke all on function public.create_order(uuid,jsonb,jsonb) from public;
grant execute on function public.create_order(uuid,jsonb,jsonb) to anon, authenticated;

create function public.change_order_status(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_order public.orders%rowtype; v_item record;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  select * into v_order from public.orders where id = p_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.status = p_status then return; end if;
  if not ((v_order.status = 'pending' and p_status in ('confirmed','cancelled')) or (v_order.status = 'confirmed' and p_status in ('fulfilled','cancelled'))) then raise exception 'INVALID_TRANSITION'; end if;
  if p_status = 'cancelled' then
    for v_item in select * from public.order_items where order_id = p_id and kind = 'physical' order by variant_id loop
      update public.product_variants set stock = stock + v_item.quantity where id = v_item.variant_id;
    end loop;
  end if;
  update public.orders set status = p_status where id = p_id;
end;
$$;
revoke all on function public.change_order_status(uuid,text) from public;
grant execute on function public.change_order_status(uuid,text) to authenticated;

create function public.set_primary_image(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare v_product uuid;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  select product_id into v_product from public.product_images where id = p_id;
  if not found then raise exception 'IMAGE_NOT_FOUND'; end if;
  perform 1 from public.products where id = v_product for update;
  update public.product_images set is_primary = false where product_id = v_product and is_primary;
  update public.product_images set is_primary = true where id = p_id;
end;
$$;
revoke all on function public.set_primary_image(uuid) from public;
grant execute on function public.set_primary_image(uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('product-images','product-images',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy admin_image_upload on storage.objects for insert to authenticated with check(bucket_id = 'product-images' and (select public.is_admin()));
create policy admin_image_update on storage.objects for update to authenticated using(bucket_id = 'product-images' and (select public.is_admin())) with check(bucket_id = 'product-images' and (select public.is_admin()));
create policy admin_image_delete on storage.objects for delete to authenticated using(bucket_id = 'product-images' and (select public.is_admin()));
create policy public_product_images on storage.objects for select to anon, authenticated using(bucket_id = 'product-images');
commit;
