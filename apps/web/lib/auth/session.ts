import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const getCurrentUser = async () => {
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

export const requireCurrentUser = async () => {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }
  return user;
};
