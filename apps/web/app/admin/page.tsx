import { redirect } from "next/navigation";
import { AdminPokemonManager } from "@/components/admin-pokemon-manager";
import { isAdminUser, parseAdminEmails } from "@/lib/auth/admin";
import { requireCurrentUser } from "@/lib/auth/session";
import { getEnv } from "@/lib/config/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireCurrentUser();

  const { ADMIN_EMAILS } = getEnv();
  const adminEmails = parseAdminEmails(ADMIN_EMAILS);
  if (!isAdminUser(user, adminEmails)) {
    redirect("/");
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pokemon")
    .select("id,name,source_type,owner_user_id,primary_type,secondary_type,hp,attack,defense,speed")
    .order("name", { ascending: true });

  if (error) {
    return (
      <main>
        <h1>Admin Dashboard</h1>
        <div className="card">Failed to load pokemon records: {error.message}</div>
      </main>
    );
  }

  return (
    <main>
      <h1>Admin Dashboard</h1>
      <p>Update pokemon stats or delete generated pokemon records.</p>
      <AdminPokemonManager pokemon={data ?? []} />
    </main>
  );
}
