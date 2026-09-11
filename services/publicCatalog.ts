import { createClient } from "@supabase/supabase-js";
import type { Product } from "../types/commerce";
import { productSelect } from "./catalog";
// Request-independent public client; never carries an administrative session.
export async function getPublicProduct(slug: string): Promise<Product | null> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
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
