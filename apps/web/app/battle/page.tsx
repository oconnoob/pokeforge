import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { BattleArena } from "@/components/battle-arena";

export const dynamic = "force-dynamic";

export default async function BattlePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <main>
      <h1>Battle Arena</h1>
      <p>Single-player 1v1 battle loop with heuristic opponent AI.</p>
      <div className="card">
        <p>Logged in as: {user.email}</p>
      </div>
      <BattleArena />
    </main>
  );
}
