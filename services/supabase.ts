import { ValidationError } from "../utils/validation-error";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicSupabaseUrl, publicSupabaseKey } from "../utils/public-config";
let client: SupabaseClient | undefined;
export function getSupabase() {
  const url = publicSupabaseUrl;
  const key = publicSupabaseKey;
  if (!url || !key)
    throw new ValidationError(
      "La tienda todavía no está conectada. Intenta más tarde o contacta con la academia.",
    );
  if (!client && typeof window !== "undefined") {
    // Retire tokens persisted by the previous localStorage configuration.
    try {
      window.localStorage.removeItem(
        `sb-${new URL(url).hostname.split(".")[0]}-auth-token`,
      );
    } catch {
      /* Browser storage may be disabled. */
    }
  }
  client ??= createClient(url, key, {
    auth: {
      storage:
        typeof window === "undefined" ? undefined : window.sessionStorage,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  });
  return client;
}
