import { ValidationError } from "../utils/validation-error";
import { getSupabase } from "./supabase";
import { validateImageFile } from "../utils/image-validation";
import type {
  Category,
  Course,
  CourseModule,
  InstructionalMedia,
  Order,
  OrderStatus,
  Product,
  ProductStatus,
  Variant,
  DeliverySettings,
  DeliveryChannel,
} from "../types/commerce";
import { trailerEmbed, validateDriveUrl } from "../utils/instructionals";
import { required } from "../utils/commerce";
export type ProductInput = Pick<
  Product,
  | "name"
  | "slug"
  | "description"
  | "category_id"
  | "kind"
  | "status"
  | "featured"
>;
export async function saveProduct(input: ProductInput, id?: string) {
  required(input.name, "Nombre");
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(input.slug))
    throw new ValidationError(
      "Slug: usa letras minúsculas, números y guiones.",
    );
  const q = id
    ? getSupabase().from("products").update(input).eq("id", id)
    : getSupabase().from("products").insert(input);
  const { data, error } = await q.select("id").single();
  if (error) throw error;
  return data.id as string;
}
export async function setProductStatus(id: string, status: ProductStatus) {
  const { error } = await getSupabase()
    .from("products")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}
export async function saveVariant(
  input: Omit<Variant, "id">,
  id?: string,
  expectedStock?: number,
) {
  if (id && !Number.isInteger(expectedStock))
    throw new ValidationError("Actualiza la variante antes de guardar.");
  const q = id
    ? getSupabase()
        .from("product_variants")
        .update(input)
        .eq("id", id)
        .eq("stock", expectedStock!)
    : getSupabase().from("product_variants").insert(input);
  const { error } = await q.select("id").single();
  if (error) throw error;
}
export async function saveCategory(
  name: string,
  slug: string,
): Promise<Category> {
  const { data, error } = await getSupabase()
    .from("categories")
    .insert({ name: required(name, "Categoría", 100), slug })
    .select()
    .single();
  if (error) throw error;
  return data as Category;
}
export async function listOrders(): Promise<Order[]> {
  const { data, error } = await getSupabase()
    .from("orders")
    .select(
      "id, customer_name, email, phone, delivery_method, notes, status, subtotal_cents, total_cents, created_at, updated_at, order_items(id, order_id, product_id, variant_id, product_name, variant_label, sku, kind, quantity, unit_price_cents, order_item_deliveries(*))",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data.map((order) => ({
    ...order,
    order_items: order.order_items.map((item) => ({
      ...item,
      order_item_deliveries: Array.isArray(item.order_item_deliveries)
        ? (item.order_item_deliveries[0] ?? null)
        : item.order_item_deliveries,
    })),
  })) as unknown as Order[];
}
export async function changeOrderStatus(id: string, status: OrderStatus) {
  const { error } = await getSupabase().rpc("change_order_status", {
    p_id: id,
    p_status: status,
  });
  if (error) throw error;
}
export async function saveCourse(input: Course) {
  trailerEmbed(input.trailer_url ?? "");
  const { error } = await getSupabase()
    .from("instructional_courses")
    .upsert(input);
  if (error) throw error;
}
export async function listDeliverySettings(): Promise<DeliverySettings[]> {
  const { data, error } = await getSupabase()
    .from("instructional_delivery_settings")
    .select("product_id, drive_url");
  if (error) throw error;
  return data as DeliverySettings[];
}
export async function saveDeliverySettings(productId: string, url: string) {
  const { error } = await getSupabase()
    .from("instructional_delivery_settings")
    .upsert({ product_id: productId, drive_url: validateDriveUrl(url) });
  if (error) throw error;
}
export async function recordItemDelivery(
  itemId: string,
  channel: DeliveryChannel,
) {
  const { error } = await getSupabase().rpc("record_item_delivery", {
    p_item_id: itemId,
    p_channel: channel,
  });
  if (error) throw error;
}
export async function saveModule(input: Omit<CourseModule, "id">, id?: string) {
  const q = id
    ? getSupabase().from("instructional_modules").update(input).eq("id", id)
    : getSupabase().from("instructional_modules").insert(input);
  const { error } = await q;
  if (error) throw error;
}
export async function listMedia(): Promise<InstructionalMedia[]> {
  const { data, error } = await getSupabase()
    .from("instructional_media")
    .select("*");
  if (error) throw error;
  return data as InstructionalMedia[];
}
export async function saveMedia(
  input: Omit<InstructionalMedia, "id">,
  id?: string,
) {
  const q = id
    ? getSupabase().from("instructional_media").update(input).eq("id", id)
    : getSupabase().from("instructional_media").insert(input);
  const { error } = await q;
  if (error) throw error;
}
export async function removeContent(
  table: "instructional_modules" | "instructional_media" | "product_images",
  id: string,
) {
  const { error } = await getSupabase().from(table).delete().eq("id", id);
  if (error) throw error;
}
export async function uploadImage(
  file: File,
  productId: string,
  variantId: string | null,
  alt: string,
) {
  await validateImageFile(file);
  const types: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  if (!types[file.type] || file.size > 5 * 1024 * 1024 || file.size === 0)
    throw new ValidationError("Usa una imagen JPG, PNG o WebP de hasta 5 MB.");
  const bitmap = await createImageBitmap(file);
  const valid =
    bitmap.width > 0 &&
    bitmap.height > 0 &&
    bitmap.width <= 10000 &&
    bitmap.height <= 10000;
  bitmap.close();
  if (!valid)
    throw new ValidationError(
      "La imagen supera las dimensiones admitidas (10000 × 10000).",
    );
  const path = productId + "/" + crypto.randomUUID() + "." + types[file.type];
  const client = getSupabase();
  const uploaded = await client.storage
    .from("product-images")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploaded.error) throw uploaded.error;
  const { data } = client.storage.from("product-images").getPublicUrl(path);
  const { error } = await client.from("product_images").insert({
    product_id: productId,
    variant_id: variantId,
    url: data.publicUrl,
    alt,
  });
  if (error) {
    await client.storage.from("product-images").remove([path]);
    throw error;
  }
}
export async function setPrimaryImage(id: string) {
  const { error } = await getSupabase().rpc("set_primary_image", { p_id: id });
  if (error) throw error;
}
export async function updateImage(
  id: string,
  input: { alt: string; position: number; variant_id: string | null },
) {
  const { error } = await getSupabase()
    .from("product_images")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}
