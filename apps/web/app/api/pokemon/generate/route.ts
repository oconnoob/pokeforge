import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generatePokemonDraftWithCodex } from "@/lib/ai/codex";
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

  return NextResponse.json({ pokemon: draft }, { status: 201 });
}
