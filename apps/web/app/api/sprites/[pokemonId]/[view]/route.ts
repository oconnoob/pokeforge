import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUserOrNull } from "@/lib/auth/request-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const viewSchema = z.enum(["front", "back"]);

export async function GET(_: NextRequest, context: { params: Promise<{ pokemonId: string; view: string }> }) {
  const { pokemonId, view } = await context.params;
  const parsedView = viewSchema.safeParse(view);

  if (!parsedView.success) {
    return NextResponse.json({ error: "Invalid sprite view." }, { status: 400 });
  }

  const user = await getRequestUserOrNull();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const adminSupabase = createSupabaseAdminClient();
  const { data: pokemon, error: pokemonError } = await adminSupabase
    .from("pokemon")
    .select("id,source_type,owner_user_id")
    .eq("id", pokemonId)
    .single();

  if (pokemonError || !pokemon) {
    return NextResponse.json({ error: "Pokemon not found" }, { status: 404 });
  }

  const canAccess = pokemon.source_type === "builtin" || pokemon.owner_user_id === user.id;
  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: spriteRow, error: spriteError } = await adminSupabase
    .from("pokemon_sprites")
    .select("storage_path")
    .eq("pokemon_id", pokemonId)
    .eq("view_side", parsedView.data)
    .single();

  if (spriteError || !spriteRow?.storage_path) {
    return NextResponse.json({ error: "Sprite not found" }, { status: 404 });
  }

  const { data: fileData, error: downloadError } = await adminSupabase.storage.from("sprites").download(spriteRow.storage_path);

  if (downloadError || !fileData) {
    return NextResponse.json({ error: "Failed to download sprite" }, { status: 404 });
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "content-type": "image/png",
      "cache-control": "private, max-age=120"
    }
  });
}
