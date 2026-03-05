import { createClient } from "@supabase/supabase-js";
import { type PokemonType } from "@pokeforge/battle-engine";
import { type PokemonCatalogEntry } from "@/lib/pokemon/catalog";
import { type PokemonDraft } from "@/lib/pokemon/validator";

export interface PersistGeneratedPokemonInput {
  prompt: string;
  draft: PokemonDraft;
  frontSprite: Buffer;
  backSprite: Buffer;
  ownerUserId: string;
}

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const requireSupabaseConfig = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || serviceRoleKey === "replace-me") {
    throw new Error("Supabase service role credentials are required to persist generated pokemon.");
  }

  return { supabaseUrl, serviceRoleKey };
};

const ensureSpritesBucketExists = async (supabase: any) => {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    throw new Error(`Failed to list storage buckets: ${listError.message}`);
  }

  const hasSpritesBucket = Array.isArray(buckets) && buckets.some((bucket: { id?: string; name?: string }) => bucket.id === "sprites" || bucket.name === "sprites");
  if (hasSpritesBucket) {
    return;
  }

  const { error: createError } = await supabase.storage.createBucket("sprites", {
    public: false,
    fileSizeLimit: "5MB"
  });

  if (createError && !createError.message.toLowerCase().includes("already exists")) {
    throw new Error(`Failed to create sprites bucket: ${createError.message}`);
  }
};

const ensureMove = async (
  supabase: any,
  move: {
    id: string;
    name: string;
    type: PokemonType;
    power: number;
    accuracy: number;
    maxPp?: number;
    currentPp?: number;
    priority?: number;
    behaviorVersion?: "v1" | "v2";
    behaviorProgram?: unknown;
    behaviorValidation?: unknown;
    behaviorFunction?: string | null;
    behaviorFunctionReview?: Record<string, unknown> | null;
  }
) => {
  await supabase.from("moves").upsert(
    {
      id: move.id,
      name: move.name,
      element_type: move.type,
      power: move.power,
      accuracy: move.accuracy,
      max_pp: move.maxPp ?? 20,
      current_pp: move.currentPp ?? move.maxPp ?? 20,
      priority: move.priority ?? 0,
      behavior_version: move.behaviorVersion ?? "v1",
      behavior_program: move.behaviorProgram ?? null,
      behavior_validation: move.behaviorValidation ?? null,
      behavior_function: move.behaviorFunction ?? null,
      behavior_function_review: move.behaviorFunctionReview ?? null
    },
    { onConflict: "id" }
  );
};

const toBehaviorSnapshot = (draft: PokemonDraft) => ({
  version: "2",
  moves: draft.moves.map((move) => ({
    id: move.id,
    name: move.name,
    behaviorVersion: move.behaviorVersion ?? "v1",
    behaviorProgram: move.behaviorProgram ?? null,
    behaviorFunction: move.behaviorFunction ?? null
  }))
});

export const persistGeneratedPokemon = async (
  input: PersistGeneratedPokemonInput
): Promise<{ pokemon: PokemonCatalogEntry }> => {
  const { serviceRoleKey, supabaseUrl } = requireSupabaseConfig();
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  await ensureSpritesBucketExists(supabase);

  const pokemonId = `generated-${crypto.randomUUID()}`;
  const pokemonSlug = slugify(input.draft.name) || "generated";
  const ownerSlug = slugify(input.ownerUserId) || "owner";
  const frontPath = `generated/${ownerSlug}/${pokemonId}/${pokemonSlug}_front.png`;
  const backPath = `generated/${ownerSlug}/${pokemonId}/${pokemonSlug}_back.png`;

  const { error: frontUploadError } = await supabase.storage.from("sprites").upload(frontPath, input.frontSprite, {
    contentType: "image/png",
    upsert: true
  });

  if (frontUploadError) {
    throw new Error(`Failed to upload front sprite: ${frontUploadError.message}`);
  }

  const { error: backUploadError } = await supabase.storage.from("sprites").upload(backPath, input.backSprite, {
    contentType: "image/png",
    upsert: true
  });

  if (backUploadError) {
    throw new Error(`Failed to upload back sprite: ${backUploadError.message}`);
  }

  const { error: pokemonError } = await supabase.from("pokemon").insert({
    id: pokemonId,
    owner_user_id: input.ownerUserId,
    name: input.draft.name,
    source_type: "generated",
    primary_type: input.draft.primaryType,
    secondary_type: input.draft.secondaryType ?? null,
    hp: input.draft.stats.hp,
    attack: input.draft.stats.attack,
    defense: input.draft.stats.defense,
    speed: input.draft.stats.speed,
    behavior_script: toBehaviorSnapshot(input.draft),
    balance_report:
      input.draft.balanceReport ?? {
        method: "rule-based-v2",
        prompt: input.prompt,
        generatedAt: new Date().toISOString()
      }
  });

  if (pokemonError) {
    throw new Error(`Failed to insert pokemon: ${pokemonError.message}`);
  }

  const { error: spriteError } = await supabase.from("pokemon_sprites").insert([
    {
      pokemon_id: pokemonId,
      view_side: "front",
      storage_path: frontPath,
      width: 64,
      height: 64
    },
    {
      pokemon_id: pokemonId,
      view_side: "back",
      storage_path: backPath,
      width: 64,
      height: 64
    }
  ]);

  if (spriteError) {
    throw new Error(`Failed to insert sprites: ${spriteError.message}`);
  }

  const moves = input.draft.moves.map((move, index) => ({
    ...move,
    id: `${pokemonId}__slot${index}__${slugify(move.name) || "move"}`
  }));
  for (let index = 0; index < moves.length; index += 1) {
    const move = moves[index];
    await ensureMove(supabase, move);
    const { error: pokemonMoveError } = await supabase.from("pokemon_moves").insert({
      pokemon_id: pokemonId,
      move_id: move.id,
      slot_index: index
    });

    if (pokemonMoveError) {
      throw new Error(`Failed to assign move: ${pokemonMoveError.message}`);
    }
  }

  return {
    pokemon: {
      id: pokemonId,
      name: input.draft.name,
      sourceType: "generated",
      primaryType: input.draft.primaryType as PokemonType,
      secondaryType: input.draft.secondaryType as PokemonType | undefined,
      hp: input.draft.stats.hp,
      attack: input.draft.stats.attack,
      defense: input.draft.stats.defense,
      speed: input.draft.stats.speed,
      frontSprite: `/api/sprites/${pokemonId}/front`,
      backSprite: `/api/sprites/${pokemonId}/back`,
      moves
    }
  };
};
