import { redirect } from "next/navigation";
import { toBattleTemplate } from "@/lib/pokemon/catalog";
import { getCurrentUser } from "@/lib/auth/session";
import { listPokemon } from "@/lib/pokemon/repository";
import { BattleArena, type BattleRosterEntry } from "@/components/battle-arena";

export const dynamic = "force-dynamic";

export default async function BattlePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  const rosterData = await listPokemon({ page: 1, pageSize: 50 });
  const roster: BattleRosterEntry[] = rosterData.items
    .filter((pokemon) => pokemon.moves.length > 0)
    .map((pokemon) => ({
      id: pokemon.id,
      name: pokemon.name,
      frontSprite: pokemon.frontSprite,
      template: toBattleTemplate(pokemon)
    }));

  return (
    <main>
      <h1>Battle Arena</h1>
      <p>Single-player 1v1 battle loop with heuristic opponent AI.</p>
      <div className="card">
        <p>Logged in as: {user.email}</p>
        <p>Battle-ready roster size: {roster.length}</p>
      </div>
      <BattleArena roster={roster} />
    </main>
  );
}
