import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client for server-only operations (Storage uploads, admin queries) that
 * need to bypass RLS. Never import this from a Client Component or expose the key to the browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
