import { getSupabase } from "./supabase";
import type { Category, Product, ProductKind } from "../types/commerce";
export const productSelect =
  "*, product_variants(*), product_images(*), instructional_courses(*), instructional_modules(*)";
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
