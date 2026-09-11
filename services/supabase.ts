import { ValidationError } from "../utils/validation-error";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
let client: SupabaseClient | undefined;
export function getSupabase() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    throw new ValidationError(
      "La tienda todavía no está conectada. Intenta más tarde o contacta con la academia.",
    );
  client ??= createClient(url, key);
  return client;
}
