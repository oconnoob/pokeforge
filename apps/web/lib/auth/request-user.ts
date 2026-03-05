import { createSupabaseServerClient } from "@/lib/supabase/server";

interface AuthUser {
  id: string;
  email?: string | null;
  app_metadata?: Record<string, unknown>;
}

export const getRequestUserOrNull = async (): Promise<AuthUser | null> => {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    return user;
  } catch {
    return null;
  }
};
