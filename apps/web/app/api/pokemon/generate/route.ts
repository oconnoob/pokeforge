import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generatePokemonDraftWithCodex } from "@/lib/ai/codex";
import { generatePokemonImagePair } from "@/lib/ai/images";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { persistGeneratedPokemon } from "@/lib/pokemon/generation-repository";
import { validatePokemonDraft } from "@/lib/pokemon/validator";

const requestSchema = z.object({
  prompt: z.string().min(10).max(400)
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid prompt payload" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const draft = await generatePokemonDraftWithCodex({ prompt: parsed.data.prompt });
    const validation = validatePokemonDraft(draft);

    if (!validation.passed) {
      return NextResponse.json(
        {
          error: "Generated pokemon failed validation",
          reasons: validation.reasons
        },
        { status: 422 }
      );
    }

    const images = await generatePokemonImagePair(draft.name, parsed.data.prompt);
    const persisted = await persistGeneratedPokemon({
      prompt: parsed.data.prompt,
      draft,
      frontSprite: images.frontPng,
      backSprite: images.backPng,
      ownerUserId: user.id
    });

    return NextResponse.json(
      {
        pokemon: persisted.pokemon,
        validation
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pokemon generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
