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
        <ul>
          {result.items.map((pokemon) => (
            <li key={pokemon.id}>
              <img src={pokemon.frontSprite} alt={`${pokemon.name} sprite`} width={64} height={64} />
              <strong>{pokemon.name}</strong> [{pokemon.sourceType}] - {pokemon.primaryType}
              {pokemon.secondaryType ? `/${pokemon.secondaryType}` : ""}
              {` | HP ${pokemon.hp} ATK ${pokemon.attack} DEF ${pokemon.defense} SPD ${pokemon.speed}`}
              {` | Sprites: ${pokemon.frontSprite}, ${pokemon.backSprite}`}
              {pokemon.sourceType === "generated" ? (
                <>
                  {" "}
                  <DeletePokemonButton pokemonId={pokemon.id} pokemonName={pokemon.name} />
                </>
              ) : null}
            </li>
          ))}
        </ul>
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
