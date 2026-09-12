import { getSupabase } from "./supabase";
import type { Category, Product, ProductKind } from "../types/commerce";
export const productSelect =
  "id,name,slug,description,category_id,kind,status,featured,created_at,updated_at, product_variants(id,product_id,sku,color,size,price_cents,stock,active), product_images(id,product_id,variant_id,url,alt,position,is_primary), instructional_courses(product_id,trainer,level,delivery_note,trailer_url), instructional_modules(id,product_id,title,description,position)";
export async function listProducts(
  kind?: ProductKind,
  admin = false,
): Promise<Product[]> {
  let query = getSupabase()
    .from("products")
    .select(productSelect)
    .order("created_at", { ascending: false });
  if (kind) query = query.eq("kind", kind);
  if (!admin) query = query.eq("status", "active");
  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as Product[];
}
export async function getProduct(slug: string): Promise<Product | null> {
  const { data, error } = await getSupabase()
    .from("products")
    .select(productSelect)
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Product | null;
}
export async function listCategories(): Promise<Category[]> {
  const { data, error } = await getSupabase()
    .from("categories")
    .select("*")
    .order("name");
  if (error) throw error;
  return data as Category[];
}
