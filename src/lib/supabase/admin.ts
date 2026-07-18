import { createClient } from "@supabase/supabase-js";

import { getPublicEnv, getServiceRoleKey } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Service-role client for trusted server jobs only (cron, webhooks).
 * Never import this from Client Components or user-facing routes.
 */
export function createAdminClient() {
  const { supabaseUrl } = getPublicEnv();
  return createClient<Database>(supabaseUrl, getServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
