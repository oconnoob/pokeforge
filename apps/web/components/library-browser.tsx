"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { PokemonCatalogEntry, PokemonSourceType } from "@/lib/pokemon/catalog";
import { useRouter } from "next/navigation";
import { SpriteImage } from "@/components/sprite-image";

interface LibraryBrowserProps {
  pokemon: PokemonCatalogEntry[];
}

type SourceFilter = "all" | "builtin" | "created";
type SortFilter = "name_asc" | "hp_desc" | "attack_desc" | "defense_desc" | "speed_desc";

const PAGE_SIZE = 12;
const LIBRARY_REFRESH_FLAG_KEY = "pokeforge:refresh-library-once";

const toPercent = (value: number) => Math.max(0, Math.min(100, Math.round((value / 180) * 100)));

const toSourceType = (source: SourceFilter): PokemonSourceType | undefined => {
  if (source === "all") {
    return undefined;
  }
  if (source === "created") {
    return "generated";
  }
  return "builtin";
};

const sortPokemon = (items: PokemonCatalogEntry[], sortBy: SortFilter) => {
  const sorted = [...items];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case "hp_desc":
        return b.hp - a.hp || a.name.localeCompare(b.name);
      case "attack_desc":
        return b.attack - a.attack || a.name.localeCompare(b.name);
      case "defense_desc":
        return b.defense - a.defense || a.name.localeCompare(b.name);
      case "speed_desc":
        return b.speed - a.speed || a.name.localeCompare(b.name);
      case "name_asc":
      default:
        return a.name.localeCompare(b.name);
    }
  });
  return sorted;
};

export function LibraryBrowser({ pokemon }: LibraryBrowserProps) {
  const router = useRouter();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [source, setSource] = useState<SourceFilter>("all");
  const [sort, setSort] = useState<SortFilter>("name_asc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const shouldRefresh = window.sessionStorage.getItem(LIBRARY_REFRESH_FLAG_KEY) === "1";
    if (!shouldRefresh) {
      return;
    }

    window.sessionStorage.removeItem(LIBRARY_REFRESH_FLAG_KEY);
    startRefreshTransition(() => {
      router.refresh();
    });
  }, [router]);

  useEffect(() => {
    const onFocus = () => {
      startRefreshTransition(() => {
        router.refresh();
      });
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [router]);

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const sourceType = toSourceType(source);

    const base = pokemon.filter((entry) => {
      if (normalizedSearch && !entry.name.toLowerCase().includes(normalizedSearch)) {
        return false;
      }
      if (type && entry.primaryType !== type) {
        return false;
      }
      if (sourceType && entry.sourceType !== sourceType) {
        return false;
      }
      return true;
    });

    return sortPokemon(base, sort);
  }, [pokemon, search, sort, source, type]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [currentPage, filtered]);

  useEffect(() => {
    setPage(1);
  }, [search, sort, source, type]);

  return (
    <>
      <section className="library-controls">
        <label>
          Search
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name..." />
        </label>
        <label>
          Type
          <select value={type} onChange={(event) => setType(event.target.value)}>
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
          Source
          <select value={source} onChange={(event) => setSource(event.target.value as SourceFilter)}>
            <option value="all">All</option>
            <option value="builtin">Built-In Only</option>
            <option value="created">Created Only</option>
          </select>
        </label>
        <label>
          Sort
          <select value={sort} onChange={(event) => setSort(event.target.value as SortFilter)}>
            <option value="name_asc">Name (A-Z)</option>
            <option value="hp_desc">HP (High-Low)</option>
            <option value="attack_desc">Attack (High-Low)</option>
            <option value="defense_desc">Defense (High-Low)</option>
            <option value="speed_desc">Speed (High-Low)</option>
          </select>
        </label>
      </section>

      <p className="library-count">
        Showing {pageItems.length} of {filtered.length}
      </p>

      <div className="pokemon-grid">
        {pageItems.map((entry) => (
          <article key={entry.id} className="pokemon-card">
            {entry.sourceType === "builtin" ? <span className="builtin-mark" title="Built-in pokemon">★</span> : null}
            <div className="pokemon-card-top">
              <SpriteImage src={entry.frontSprite} alt={`${entry.name} sprite`} width={96} height={96} />
              <div className="pokemon-card-meta">
                <h3>{entry.name}</h3>
                <div className="type-badges">
                  <span className={`type-chip type-${entry.primaryType}`}>{entry.primaryType}</span>
                  {entry.secondaryType ? <span className={`type-chip type-${entry.secondaryType}`}>{entry.secondaryType}</span> : null}
                </div>
              </div>
            </div>
            <div className="pokemon-stats-row">
              <div className="stat-item stat-hp">
                <span className="stat-label">HP {entry.hp}</span>
                <div className="stat-track">
                  <div className="stat-fill" style={{ width: `${toPercent(entry.hp)}%` }} />
                </div>
              </div>
              <div className="stat-item stat-atk">
                <span className="stat-label">ATK {entry.attack}</span>
                <div className="stat-track">
                  <div className="stat-fill" style={{ width: `${toPercent(entry.attack)}%` }} />
                </div>
              </div>
              <div className="stat-item stat-def">
                <span className="stat-label">DEF {entry.defense}</span>
                <div className="stat-track">
                  <div className="stat-fill" style={{ width: `${toPercent(entry.defense)}%` }} />
                </div>
              </div>
              <div className="stat-item stat-spd">
                <span className="stat-label">SPD {entry.speed}</span>
                <div className="stat-track">
                  <div className="stat-fill" style={{ width: `${toPercent(entry.speed)}%` }} />
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="library-pagination">
        <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage <= 1}>
          Previous
        </button>
        <span>
          Page {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          disabled={currentPage >= totalPages}
        >
          Next
        </button>
        <button
          type="button"
          className="library-refresh-icon-button"
          aria-label="Refresh library"
          title="Refresh library"
          disabled={isRefreshing}
          onClick={() =>
            startRefreshTransition(() => {
              router.refresh();
            })
          }
        >
          <span aria-hidden="true">⟳</span>
        </button>
      </div>
    </>
  );
}
