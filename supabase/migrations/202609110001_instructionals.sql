-- Aplicar después de las dos migraciones de comercio y seguridad.
-- Conserva cursos, módulos, referencias y pedidos existentes.
begin;
alter table public.instructional_courses add column trailer_url text not null default '' check(length(trailer_url) <= 2000);

create table public.instructional_delivery_settings (
  product_id uuid primary key references public.products(id),
  drive_url text not null check(length(drive_url) <= 2000 and drive_url ~ '^https://drive[.]google[.]com/(file/d/|drive/folders/)[a-zA-Z0-9_-]+'),
  updated_at timestamptz not null default now()
);
alter table public.instructional_delivery_settings enable row level security;
revoke all on public.instructional_delivery_settings from public, anon, authenticated;
grant select, insert, update, delete on public.instructional_delivery_settings to authenticated;
create policy admin_delivery_settings on public.instructional_delivery_settings for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
create trigger delivery_settings_updated before update on public.instructional_delivery_settings for each row execute function public.touch_updated_at();
create trigger security_audit after insert or update or delete on public.instructional_delivery_settings for each row execute function private.audit_change();

alter table public.order_items add column product_id uuid references public.products(id);
update public.order_items i set product_id = v.product_id from public.product_variants v where v.id = i.variant_id;
alter table public.order_items alter column product_id set not null;
create function private.capture_order_product() returns trigger language plpgsql set search_path = '' as $$
begin
  select product_id into new.product_id from public.product_variants where id = new.variant_id;
  return new;
end;
$$;
revoke all on function private.capture_order_product() from public, anon, authenticated;
create trigger capture_order_product before insert on public.order_items for each row execute function private.capture_order_product();

create table public.order_item_deliveries (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null unique references public.order_items(id),
  delivered_at timestamptz not null default now(),
  channel text not null check(channel in ('whatsapp','email','other','pickup')),
  recipient_email text not null,
  drive_url text,
  delivery_note text not null default '',
  delivered_by uuid not null
);
alter table public.order_item_deliveries enable row level security;
revoke all on public.order_item_deliveries from public, anon, authenticated;
grant select on public.order_item_deliveries to authenticated;
create policy admin_deliveries_read on public.order_item_deliveries for select to authenticated using ((select public.is_admin()));
create trigger security_audit after insert on public.order_item_deliveries for each row execute function private.audit_change();

-- Protege también los cambios de estado hechos mediante la función anterior.
create function private.guard_order_delivery() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'fulfilled' and old.status <> 'fulfilled' and exists (
    select 1 from public.order_items i where i.order_id = new.id
    and not exists(select 1 from public.order_item_deliveries d where d.order_item_id = i.id)
  ) then raise exception 'DELIVERY_PENDING'; end if;
  if new.status = 'cancelled' and old.status <> 'cancelled' and exists (
    select 1 from public.order_items i join public.order_item_deliveries d on d.order_item_id = i.id where i.order_id = new.id
  ) then raise exception 'DELIVERY_ALREADY_RECORDED'; end if;
  return new;
end;
$$;
revoke all on function private.guard_order_delivery() from public, anon, authenticated;
create trigger guard_order_delivery before update on public.orders for each row execute function private.guard_order_delivery();

create function public.record_item_delivery(p_item_id uuid, p_channel text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_item public.order_items%rowtype; v_order public.orders%rowtype; v_url text; v_note text;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  select * into v_item from public.order_items where id = p_item_id;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  select * into v_order from public.orders where id = v_item.order_id for update;
  -- El bloqueo de la orden serializa entregas, cancelaciones y reintentos.
  if exists(select 1 from public.order_item_deliveries where order_item_id = p_item_id) then return; end if;
  if v_order.status <> 'confirmed' then raise exception 'PAYMENT_NOT_CONFIRMED'; end if;
  if p_channel is null or (v_item.kind = 'course' and p_channel not in ('whatsapp','email','other'))
    or (v_item.kind = 'physical' and p_channel <> 'pickup') then raise exception 'INVALID_DELIVERY_CHANNEL'; end if;
  if v_item.kind = 'course' then
    select drive_url into v_url from public.instructional_delivery_settings where product_id = v_item.product_id;
    if v_url is null then raise exception 'DRIVE_LINK_REQUIRED'; end if;
    select delivery_note into v_note from public.instructional_courses where product_id = v_item.product_id;
  end if;
  insert into public.order_item_deliveries(order_item_id,channel,recipient_email,drive_url,delivery_note,delivered_by)
  values(p_item_id,p_channel,v_order.email,v_url,coalesce(v_note,''),auth.uid());
  if not exists(select 1 from public.order_items i where i.order_id = v_order.id and not exists(
    select 1 from public.order_item_deliveries d where d.order_item_id = i.id
  )) then update public.orders set status = 'fulfilled' where id = v_order.id; end if;
end;
$$;
revoke all on function public.record_item_delivery(uuid,text) from public, anon, authenticated;
grant execute on function public.record_item_delivery(uuid,text) to authenticated;

create function private.validate_course_publication() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.kind = 'course' and new.status = 'active' and (TG_OP = 'INSERT' or old.status <> 'active') then
    if not exists(select 1 from public.product_variants where product_id = new.id and active)
      or not exists(select 1 from public.product_images where product_id = new.id)
      or not exists(select 1 from public.instructional_courses where product_id = new.id)
    then raise exception 'COURSE_PUBLICATION_INCOMPLETE'; end if;
  end if;
  return new;
end;
$$;
revoke all on function private.validate_course_publication() from public, anon, authenticated;
create trigger validate_course_publication before insert or update on public.products for each row execute function private.validate_course_publication();
commit;
