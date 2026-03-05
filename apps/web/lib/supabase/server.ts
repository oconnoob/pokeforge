import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/config/env";

export const createSupabaseServerClient = async () => {
  const env = getEnv();
  const cookieStore = await cookies();
  type CookieMutation = {
    name: string;
    value: string;
    options?: {
      domain?: string;
      expires?: Date;
      httpOnly?: boolean;
      maxAge?: number;
      path?: string;
      sameSite?: "lax" | "strict" | "none" | boolean;
      secure?: boolean;
    };
  };

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet: CookieMutation[]) => {
        // In server components, cookie mutation may be disallowed.
        // Route handlers and server actions still apply these writes.
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Ignore cookie write failures in render context.
        }
      }
    }
  });
};
