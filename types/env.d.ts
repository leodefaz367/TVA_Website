/// <reference types="vite/client" />
/// <reference types="@cloudflare/workers-types" />
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}
