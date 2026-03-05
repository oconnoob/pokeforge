import { NextRequest, NextResponse } from "next/server";
import { isAdminUser, parseAdminEmails } from "@/lib/auth/admin";
import { getRequestUserOrNull } from "@/lib/auth/request-user";
import { getEnv } from "@/lib/config/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function DELETE(_: NextRequest, context: { params: Promise<{ pokemonId: string }> }) {
  const { pokemonId } = await context.params;
  const user = await getRequestUserOrNull();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { ADMIN_EMAILS } = getEnv();
  const adminEmails = parseAdminEmails(ADMIN_EMAILS);
  const isAdmin = isAdminUser(user, adminEmails);

  const adminSupabase = createSupabaseAdminClient();

  const { data: pokemon, error: pokemonError } = await adminSupabase
    .from("pokemon")
    .select("id,source_type,owner_user_id")
    .eq("id", pokemonId)
    .single();

  if (pokemonError || !pokemon) {
    return NextResponse.json({ error: "Pokemon not found" }, { status: 404 });
  }

  if (pokemon.source_type !== "generated") {
    return NextResponse.json({ error: "Only generated pokemon can be deleted." }, { status: 400 });
  }

  const isOwner = pokemon.owner_user_id === user.id;
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: spriteRows } = await adminSupabase
    .from("pokemon_sprites")
    .select("storage_path")
    .eq("pokemon_id", pokemonId);

  const { data: moveRows } = await adminSupabase
    .from("pokemon_moves")
    .select("move_id")
    .eq("pokemon_id", pokemonId);

  const { error: deletePokemonError } = await adminSupabase.from("pokemon").delete().eq("id", pokemonId);

  if (deletePokemonError) {
    return NextResponse.json({ error: deletePokemonError.message }, { status: 400 });
  }

  const spritePaths = (spriteRows ?? [])
    .map((row: { storage_path?: string }) => row.storage_path)
    .filter((value: string | undefined): value is string => Boolean(value));

  if (spritePaths.length > 0) {
    await adminSupabase.storage.from("sprites").remove(spritePaths);
  }

  const moveIds = (moveRows ?? []).map((row: { move_id: string }) => row.move_id);
  for (const moveId of moveIds) {
    const { count } = await adminSupabase
      .from("pokemon_moves")
      .select("move_id", { count: "exact", head: true })
      .eq("move_id", moveId);

    if (!count || count === 0) {
      await adminSupabase.from("moves").delete().eq("id", moveId);
    }
  }

  return new NextResponse(null, { status: 204 });
}
