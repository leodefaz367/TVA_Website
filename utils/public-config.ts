// Only public Supabase connection values belong here. Both build targets use
// the same project; privileged credentials must never be added to this module.
export const publicSupabaseUrl =
  import.meta.env?.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
export const publicSupabaseKey =
  import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
