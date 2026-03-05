import { createSupabaseServerClient } from "@/lib/supabase/server";

export const getCurrentUser = async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user;
};
