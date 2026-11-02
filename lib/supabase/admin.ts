import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Server-only client with the Supabase secret key. It bypasses row-level security: use it only in trusted routes. */
export function createAdminClient(): SupabaseClient {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not set");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
