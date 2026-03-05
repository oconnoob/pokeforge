import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth/session";
import { listPokemon } from "@/lib/pokemon/repository";
import { BattlePrep, type BattlePrepEntry } from "@/components/battle-prep";

export const dynamic = "force-dynamic";

export default async function BattlePrepPage() {
  const user = await requireCurrentUser();

  const rosterData = await listPokemon({ page: 1, pageSize: 250, requesterUserId: user.id });
  const roster: BattlePrepEntry[] = rosterData.items
    .filter((pokemon) => pokemon.moves.length > 0)
    .map((pokemon) => ({
      id: pokemon.id,
      name: pokemon.name,
      frontSprite: pokemon.frontSprite,
      primaryType: pokemon.primaryType,
      secondaryType: pokemon.secondaryType,
      hp: pokemon.hp,
      attack: pokemon.attack,
      defense: pokemon.defense,
      speed: pokemon.speed
    }));

  return (
    <main className="battle-page">
      <section className="battle-stage">
        <div className="battle-stage-backdrop" aria-hidden="true" />
        <div className="battle-stage-content">
          <Link href="/" className="create-back-link">
            {"< Back to Main Menu"}
          </Link>
          <h1 className="create-title">Battle Prep</h1>
          <div className="battle-prep-shell">
            <BattlePrep roster={roster} />
          </div>
        </div>
      </section>
    </main>
  );
}
