import { createClient } from "@supabase/supabase-js";
import {
  BUILTIN_POKEMON_CATALOG,
  createDefaultMovesForType,
  type PokemonCatalogEntry,
  type PokemonSourceType
} from "@/lib/pokemon/catalog";

export interface ListPokemonOptions {
  page?: number;
  pageSize?: number;
  sourceType?: PokemonSourceType;
  search?: string;
}

export interface ListPokemonResult {
  items: PokemonCatalogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

interface ResolvedListPokemonOptions {
  page: number;
  pageSize: number;
  sourceType?: PokemonSourceType;
  search: string;
}

const clampPageSize = (value: number) => Math.min(50, Math.max(1, value));

const applyFilters = (items: PokemonCatalogEntry[], options: ResolvedListPokemonOptions): PokemonCatalogEntry[] => {
  let filtered = items;

  if (options.sourceType) {
    filtered = filtered.filter((item) => item.sourceType === options.sourceType);
  }

  if (options.search) {
    const normalized = options.search.toLowerCase().trim();
    filtered = filtered.filter((item) => item.name.toLowerCase().includes(normalized));
  }

  return filtered;
};

const paginate = (items: PokemonCatalogEntry[], page: number, pageSize: number) => {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
};

const toFallbackResult = (options: ResolvedListPokemonOptions): ListPokemonResult => {
  const filtered = applyFilters(BUILTIN_POKEMON_CATALOG, options);
  return {
    items: paginate(filtered, options.page, options.pageSize),
    total: filtered.length,
    page: options.page,
    pageSize: options.pageSize
  };
};

const mapDbPokemonRow = (row: any): PokemonCatalogEntry => {
  const front = row.pokemon_sprites?.find((sprite: any) => sprite.view_side === "front")?.storage_path;
  const back = row.pokemon_sprites?.find((sprite: any) => sprite.view_side === "back")?.storage_path;
  const mappedMoves = (row.pokemon_moves ?? [])
    .sort((a: any, b: any) => a.slot_index - b.slot_index)
    .map((entry: any) => ({
      id: entry.moves.id,
      name: entry.moves.name,
      type: entry.moves.element_type,
      power: entry.moves.power,
      accuracy: entry.moves.accuracy
    }));
  const fallbackMoves = createDefaultMovesForType(row.name, row.primary_type);

  return {
    id: row.id,
    name: row.name,
    sourceType: row.source_type,
    primaryType: row.primary_type,
    secondaryType: row.secondary_type ?? undefined,
    hp: row.hp,
    attack: row.attack,
    defense: row.defense,
    speed: row.speed,
    frontSprite: front ?? `/sprites/${row.name.toLowerCase()}_front.png`,
    backSprite: back ?? `/sprites/${row.name.toLowerCase()}_back.png`,
    moves: mappedMoves.length > 0 ? mappedMoves : fallbackMoves
  };
};

const trySupabaseList = async (options: ResolvedListPokemonOptions): Promise<ListPokemonResult | null> => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || serviceRoleKey === "replace-me") {
    return null;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const start = (options.page - 1) * options.pageSize;
  const end = start + options.pageSize - 1;

  let query = supabase
    .from("pokemon")
    .select(
      "id,name,source_type,primary_type,secondary_type,hp,attack,defense,speed,pokemon_sprites(view_side,storage_path),pokemon_moves(slot_index,moves(id,name,element_type,power,accuracy))",
      { count: "exact" }
    )
    .order("name", { ascending: true })
    .range(start, end);

  if (options.sourceType) {
    query = query.eq("source_type", options.sourceType);
  }

  if (options.search) {
    query = query.ilike("name", `%${options.search}%`);
  }

  const { data, count, error } = await query;

  if (error || !data) {
    return null;
  }

  return {
    items: data.map(mapDbPokemonRow),
    total: count ?? data.length,
    page: options.page,
    pageSize: options.pageSize
  };
};

export const listPokemon = async (options: ListPokemonOptions = {}): Promise<ListPokemonResult> => {
  const resolved: ResolvedListPokemonOptions = {
    page: Math.max(1, options.page ?? 1),
    pageSize: clampPageSize(options.pageSize ?? 24),
    sourceType: options.sourceType,
    search: (options.search ?? "").trim()
  };

  const supabaseResult = await trySupabaseList(resolved);
  if (supabaseResult) {
    return supabaseResult;
  }

  return toFallbackResult(resolved);
};
