import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  playerPokemonId: z.string().uuid(),
  opponentPokemonId: z.string().uuid()
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid battle payload" }, { status: 400 });
  }

  return NextResponse.json(
    {
      battleId: crypto.randomUUID(),
      status: "initialized",
      participants: parsed.data
    },
    { status: 201 }
  );
}
