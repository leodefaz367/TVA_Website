import { createClient } from "@supabase/supabase-js";
import type { Product } from "../types/commerce";
import { productSelect } from "./catalog";
import { publicSupabaseUrl, publicSupabaseKey } from "../utils/public-config";
// Request-independent public client; never carries an administrative session.
export async function getPublicProduct(slug: string): Promise<Product | null> {
  if (slug.length > 180 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return null;
  const url = publicSupabaseUrl;
  const key = publicSupabaseKey;
  if (!url || !key) throw new Error("Catalog is not configured");
  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const { data, error } = await client
    .from("products")
    .select(productSelect)
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Product | null;
}
