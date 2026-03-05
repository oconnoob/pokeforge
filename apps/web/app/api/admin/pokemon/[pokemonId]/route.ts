import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminUser, parseAdminEmails } from "@/lib/auth/admin";
import { getEnv } from "@/lib/config/env";
import { logInfo, logWarn } from "@/lib/observability/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const updateSchema = z
  .object({
    name: z.string().min(2).max(40).optional(),
    primary_type: z.enum(["normal", "fire", "water", "grass", "electric", "rock", "ground", "ice", "fighting", "psychic"]).optional(),
    secondary_type: z
      .enum(["normal", "fire", "water", "grass", "electric", "rock", "ground", "ice", "fighting", "psychic"])
      .nullable()
      .optional(),
    hp: z.number().int().min(35).max(180).optional(),
    attack: z.number().int().min(20).max(180).optional(),
    defense: z.number().int().min(20).max(180).optional(),
    speed: z.number().int().min(20).max(180).optional()
  })
  .refine((payload) => Object.values(payload).some((value) => value !== undefined), {
    message: "At least one field must be provided."
  });

export async function PATCH(request: NextRequest, context: { params: Promise<{ pokemonId: string }> }) {
  const requestId = crypto.randomUUID();
  const { pokemonId } = await context.params;

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update payload" }, { status: 400 });
  }

  const serverSupabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await serverSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { ADMIN_EMAILS } = getEnv();
  const adminEmails = parseAdminEmails(ADMIN_EMAILS);

  if (!isAdminUser(user, adminEmails)) {
    logWarn({ event: "admin.update_pokemon.forbidden", requestId, userId: user.id, pokemonId });
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const adminSupabase = createSupabaseAdminClient();
  const { data, error } = await adminSupabase
    .from("pokemon")
    .update(parsed.data)
    .eq("id", pokemonId)
    .select("id,name,source_type,primary_type,secondary_type,hp,attack,defense,speed")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  logInfo({ event: "admin.update_pokemon.success", requestId, userId: user.id, pokemonId });

  return NextResponse.json({ pokemon: data }, { status: 200 });
}
