import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth/session";
import { listPokemon } from "@/lib/pokemon/repository";
import type { PokemonCatalogEntry } from "@/lib/pokemon/catalog";
import { LibraryBrowser } from "@/components/library-browser";

const LIBRARY_FETCH_PAGE_SIZE = 50;
const LIBRARY_FETCH_MAX_PAGES = 20;
export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const user = await requireCurrentUser();
  const allPokemon: PokemonCatalogEntry[] = [];
  let page = 1;

  while (page <= LIBRARY_FETCH_MAX_PAGES) {
    const result = await listPokemon({
      page,
      pageSize: LIBRARY_FETCH_PAGE_SIZE,
      requesterUserId: user.id,
      sortBy: "name_asc"
    });

    allPokemon.push(...result.items);

    if (allPokemon.length >= result.total || result.items.length === 0) {
      break;
    }
    page += 1;
  }

  return (
    <main className="library-page">
      <section className="library-stage">
        <div className="library-stage-backdrop" aria-hidden="true" />
        <div className="library-stage-content">
          <Link href="/" className="create-back-link">
            {"< Back to Main Menu"}
          </Link>
          <h1 className="create-title">Pokemon Library</h1>

          <section className="create-form-panel">
            <LibraryBrowser pokemon={allPokemon} />
          </section>
        </div>
      </section>
    </main>
  );
}
