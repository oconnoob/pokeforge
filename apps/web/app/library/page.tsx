import Link from "next/link";
import { DeletePokemonButton } from "@/components/delete-pokemon-button";
import { getCurrentUser } from "@/lib/auth/session";
import { listPokemon } from "@/lib/pokemon/repository";

interface LibraryPageProps {
  searchParams?: Promise<{
    page?: string;
    search?: string;
  }>;
}

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const toPercent = (value: number) => Math.max(0, Math.min(100, Math.round((value / 180) * 100)));

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const user = await getCurrentUser();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const page = parsePositiveInt(resolvedSearchParams?.page, 1);
  const search = (resolvedSearchParams?.search ?? "").trim();

  const result = await listPokemon({ page, pageSize: 12, search, requesterUserId: user?.id });
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const hasPrev = result.page > 1;
  const hasNext = result.page < totalPages;

  return (
    <main>
      <h1>Pokemon Library</h1>
      <p>Dynamic roster sourced from Supabase when available, with local built-in fallback data.</p>
      <div className="card">
        <h2>Available Pokemon</h2>
        <p>
          Showing {result.items.length} of {result.total}
        </p>
        <div className="pokemon-grid">
          {result.items.map((pokemon) => (
            <article key={pokemon.id} className="pokemon-card">
              <div className="pokemon-card-top">
                <img src={pokemon.frontSprite} alt={`${pokemon.name} sprite`} width={96} height={96} />
                <div className="pokemon-card-meta">
                  <h3>{pokemon.name}</h3>
                  <p className="pokemon-card-subtitle">
                    {pokemon.sourceType} | {pokemon.primaryType}
                    {pokemon.secondaryType ? `/${pokemon.secondaryType}` : ""}
                  </p>
                </div>
              </div>

              {pokemon.sourceType === "generated" ? (
                <div className="pokemon-card-actions">
                  <DeletePokemonButton pokemonId={pokemon.id} pokemonName={pokemon.name} />
                </div>
              ) : null}

              <div className="pokemon-stats-row">
                <div className="stat-item stat-hp">
                  <span className="stat-label">HP {pokemon.hp}</span>
                  <div className="stat-track">
                    <div className="stat-fill" style={{ width: `${toPercent(pokemon.hp)}%` }} />
                  </div>
                </div>
                <div className="stat-item stat-atk">
                  <span className="stat-label">ATK {pokemon.attack}</span>
                  <div className="stat-track">
                    <div className="stat-fill" style={{ width: `${toPercent(pokemon.attack)}%` }} />
                  </div>
                </div>
                <div className="stat-item stat-def">
                  <span className="stat-label">DEF {pokemon.defense}</span>
                  <div className="stat-track">
                    <div className="stat-fill" style={{ width: `${toPercent(pokemon.defense)}%` }} />
                  </div>
                </div>
                <div className="stat-item stat-spd">
                  <span className="stat-label">SPD {pokemon.speed}</span>
                  <div className="stat-track">
                    <div className="stat-fill" style={{ width: `${toPercent(pokemon.speed)}%` }} />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
          {hasPrev ? (
            <Link href={`/library?page=${result.page - 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`}>Previous</Link>
          ) : (
            <span>Previous</span>
          )}
          <span>
            Page {result.page} / {totalPages}
          </span>
          {hasNext ? (
            <Link href={`/library?page=${result.page + 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`}>Next</Link>
          ) : (
            <span>Next</span>
          )}
        </div>
      </div>
    </main>
  );
}
