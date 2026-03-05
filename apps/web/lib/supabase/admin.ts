import { createClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/config/env";

export const createSupabaseAdminClient = () => {
  const env = getEnv();

  if (!env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY === "replace-me") {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin operations.");
  }

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
};
