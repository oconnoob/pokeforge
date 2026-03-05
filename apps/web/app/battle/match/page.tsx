import Link from "next/link";
import { redirect } from "next/navigation";
import { toBattleTemplate } from "@/lib/pokemon/catalog";
import { requireCurrentUser } from "@/lib/auth/session";
import { listPokemon } from "@/lib/pokemon/repository";
import { BattleMatch, type BattleMatchEntry } from "@/components/battle-match";

interface BattleMatchPageProps {
  searchParams?: Promise<{
    player?: string;
    opponent?: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function BattleMatchPage({ searchParams }: BattleMatchPageProps) {
  const user = await requireCurrentUser();
  const params = searchParams ? await searchParams : undefined;
  const playerId = (params?.player ?? "").trim();
  const opponentId = (params?.opponent ?? "").trim();

  if (!playerId || !opponentId) {
    redirect("/battle");
  }

  const rosterData = await listPokemon({ page: 1, pageSize: 250, requesterUserId: user.id });
  const roster: BattleMatchEntry[] = rosterData.items
    .filter((pokemon) => pokemon.moves.length > 0)
    .map((pokemon) => ({
      id: pokemon.id,
      name: pokemon.name,
      frontSprite: pokemon.frontSprite,
      backSprite: pokemon.backSprite,
      template: toBattleTemplate(pokemon)
    }));

  return (
    <main className="battle-page">
      <section className="battle-stage">
        <div className="battle-stage-backdrop" aria-hidden="true" />
        <div className="battle-stage-content">
          <Link href="/battle" className="create-back-link">
            {"< Back to Battle Prep"}
          </Link>
          <h1 className="create-title">Battle Arena</h1>
          <div className="battle-match-shell">
            <BattleMatch roster={roster} playerId={playerId} opponentId={opponentId} />
          </div>
        </div>
      </section>
    </main>
  );
}
