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
  requesterUserId?: string;
  primaryType?: string;
  sortBy?: "name_asc" | "hp_desc" | "attack_desc" | "defense_desc" | "speed_desc";
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
  requesterUserId?: string;
  primaryType?: string;
  sortBy: "name_asc" | "hp_desc" | "attack_desc" | "defense_desc" | "speed_desc";
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

  if (options.primaryType) {
    filtered = filtered.filter((item) => item.primaryType === options.primaryType);
  }

  return filtered;
};

const sortPokemon = (items: PokemonCatalogEntry[], sortBy: ResolvedListPokemonOptions["sortBy"]) => {
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

const paginate = (items: PokemonCatalogEntry[], page: number, pageSize: number) => {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
};

const toFallbackResult = (options: ResolvedListPokemonOptions): ListPokemonResult => {
  const filtered = applyFilters(BUILTIN_POKEMON_CATALOG, options);
  const sorted = sortPokemon(filtered, options.sortBy);
  return {
    items: paginate(sorted, options.page, options.pageSize),
    total: sorted.length,
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
      accuracy: entry.moves.accuracy,
      maxPp: entry.moves.max_pp ?? 20,
      currentPp: entry.moves.current_pp ?? entry.moves.max_pp ?? 20,
      priority: entry.moves.priority ?? 0,
      behaviorVersion: entry.moves.behavior_version ?? "v1",
      behaviorProgram: entry.moves.behavior_program ?? null
    }));
  const fallbackMoves = createDefaultMovesForType(row.name, row.primary_type);

  const frontSprite =
    row.source_type === "generated"
      ? `/api/sprites/${row.id}/front`
      : (front ?? `/sprites/${row.name.toLowerCase()}_front.png`);
  const backSprite =
    row.source_type === "generated"
      ? `/api/sprites/${row.id}/back`
      : (back ?? `/sprites/${row.name.toLowerCase()}_back.png`);

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
    frontSprite,
    backSprite,
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
      "id,name,source_type,primary_type,secondary_type,hp,attack,defense,speed,pokemon_sprites(view_side,storage_path),pokemon_moves(slot_index,moves(id,name,element_type,power,accuracy,max_pp,current_pp,priority,behavior_version,behavior_program))",
      { count: "exact" }
    )
    .range(start, end);

  switch (options.sortBy) {
    case "hp_desc":
      query = query.order("hp", { ascending: false }).order("name", { ascending: true });
      break;
    case "attack_desc":
      query = query.order("attack", { ascending: false }).order("name", { ascending: true });
      break;
    case "defense_desc":
      query = query.order("defense", { ascending: false }).order("name", { ascending: true });
      break;
    case "speed_desc":
      query = query.order("speed", { ascending: false }).order("name", { ascending: true });
      break;
    case "name_asc":
    default:
      query = query.order("name", { ascending: true });
      break;
  }

  if (options.requesterUserId) {
    query = query.or(`source_type.eq.builtin,owner_user_id.eq.${options.requesterUserId}`);
  } else {
    query = query.eq("source_type", "builtin");
  }

  if (options.sourceType) {
    query = query.eq("source_type", options.sourceType);
  }

  if (options.search) {
    query = query.ilike("name", `%${options.search}%`);
  }

  if (options.primaryType) {
    query = query.eq("primary_type", options.primaryType);
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
  const sortBy =
    options.sortBy === "hp_desc" ||
    options.sortBy === "attack_desc" ||
    options.sortBy === "defense_desc" ||
    options.sortBy === "speed_desc" ||
    options.sortBy === "name_asc"
      ? options.sortBy
      : "name_asc";

  const resolved: ResolvedListPokemonOptions = {
    page: Math.max(1, options.page ?? 1),
    pageSize: clampPageSize(options.pageSize ?? 24),
    sourceType: options.sourceType,
    search: (options.search ?? "").trim(),
    requesterUserId: options.requesterUserId,
    primaryType: options.primaryType,
    sortBy
  };

  const supabaseResult = await trySupabaseList(resolved);
  if (supabaseResult) {
    return supabaseResult;
  }

  return toFallbackResult(resolved);
};
