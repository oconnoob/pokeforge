import { DeletePokemonButton } from "@/components/delete-pokemon-button";
import { getCurrentUser } from "@/lib/auth/session";
import { listPokemon } from "@/lib/pokemon/repository";

interface LibraryPageProps {
  searchParams?: Promise<{
    page?: string;
    search?: string;
    type?: string;
    sort?: string;
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
  const type = (resolvedSearchParams?.type ?? "").trim().toLowerCase();
  const sort = (resolvedSearchParams?.sort ?? "name_asc").trim();
  const selectedType = type.length > 0 ? type : undefined;

  const result = await listPokemon({
    page,
    pageSize: 12,
    search,
    requesterUserId: user?.id,
    primaryType: selectedType,
    sortBy: sort as "name_asc" | "hp_desc" | "attack_desc" | "defense_desc" | "speed_desc"
  });
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const hasPrev = result.page > 1;
  const hasNext = result.page < totalPages;
  const queryForPage = (targetPage: number) => {
    const params = new URLSearchParams();
    params.set("page", String(targetPage));
    if (search) {
      params.set("search", search);
    }
    if (selectedType) {
      params.set("type", selectedType);
    }
    if (sort && sort !== "name_asc") {
      params.set("sort", sort);
    }
    return `/library?${params.toString()}`;
  };

  return (
    <main>
      <h1>Pokemon Library</h1>
      <p>Dynamic roster sourced from Supabase when available, with local built-in fallback data.</p>
      <div className="card">
        <form className="library-controls" method="GET" action="/library">
          <label>
            Search
            <input name="search" defaultValue={search} placeholder="Name..." />
          </label>
          <label>
            Type
            <select name="type" defaultValue={selectedType ?? ""}>
              <option value="">All</option>
              <option value="normal">Normal</option>
              <option value="fire">Fire</option>
              <option value="water">Water</option>
              <option value="grass">Grass</option>
              <option value="electric">Electric</option>
              <option value="rock">Rock</option>
              <option value="ground">Ground</option>
              <option value="ice">Ice</option>
              <option value="fighting">Fighting</option>
              <option value="psychic">Psychic</option>
            </select>
          </label>
          <label>
            Sort
            <select name="sort" defaultValue={sort}>
              <option value="name_asc">Name (A-Z)</option>
              <option value="hp_desc">HP (High-Low)</option>
              <option value="attack_desc">Attack (High-Low)</option>
              <option value="defense_desc">Defense (High-Low)</option>
              <option value="speed_desc">Speed (High-Low)</option>
            </select>
          </label>
          <button type="submit">Apply</button>
        </form>

        <h2>Available Pokemon</h2>
        <p>
          Showing {result.items.length} of {result.total}
        </p>
        <div className="pokemon-grid">
          {result.items.map((pokemon) => (
            <article key={pokemon.id} className="pokemon-card">
              {pokemon.sourceType === "builtin" ? <span className="builtin-mark" title="Built-in pokemon">★</span> : null}
              <div className="pokemon-card-top">
                <img src={pokemon.frontSprite} alt={`${pokemon.name} sprite`} width={96} height={96} />
                <div className="pokemon-card-meta">
                  <h3>{pokemon.name}</h3>
                  <p className="pokemon-card-subtitle">
                    {pokemon.primaryType}
                    {pokemon.secondaryType ? `/${pokemon.secondaryType}` : ""}
                  </p>
                  <div className="type-badges">
                    <span className={`type-chip type-${pokemon.primaryType}`}>{pokemon.primaryType}</span>
                    {pokemon.secondaryType ? (
                      <span className={`type-chip type-${pokemon.secondaryType}`}>{pokemon.secondaryType}</span>
                    ) : null}
                  </div>
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
            <a href={queryForPage(result.page - 1)}>Previous</a>
          ) : (
            <span>Previous</span>
          )}
          <span>
            Page {result.page} / {totalPages}
          </span>
          {hasNext ? (
            <a href={queryForPage(result.page + 1)}>Next</a>
          ) : (
            <span>Next</span>
          )}
        </div>
      </div>
    </main>
  );
}
