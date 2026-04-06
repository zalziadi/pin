import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client with SERVICE_ROLE_KEY.
 * Use ONLY in API routes / server functions — never expose to client.
 */
export function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
