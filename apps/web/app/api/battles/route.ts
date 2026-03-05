import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logInfo, logWarn } from "@/lib/observability/logger";
import { getClientKey, routeRateLimiter } from "@/lib/security/rate-limit";

const requestSchema = z.object({
  playerPokemonId: z.string().min(1),
  opponentPokemonId: z.string().min(1)
});

const BATTLE_START_LIMIT = 30;
const BATTLE_START_WINDOW_MS = 60_000;

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const clientKey = getClientKey(request.headers.get("x-forwarded-for"));
  const rate = routeRateLimiter.consume(`battle-start:${clientKey}`, BATTLE_START_LIMIT, BATTLE_START_WINDOW_MS);

  if (!rate.allowed) {
    logWarn({ event: "battle.rate_limited", requestId, clientKey });
    return NextResponse.json({ error: "Rate limit exceeded. Please try again shortly." }, { status: 429 });
  }

  const body = await request.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid battle payload" }, { status: 400 });
  }

  if (parsed.data.playerPokemonId === parsed.data.opponentPokemonId) {
    return NextResponse.json({ error: "Player and opponent Pokemon must be different." }, { status: 422 });
  }

  const battleId = crypto.randomUUID();

  logInfo({ event: "battle.started", requestId, battleId, clientKey });

  return NextResponse.json(
    {
      battleId,
      status: "initialized",
      participants: parsed.data
    },
    { status: 201 }
  );
}
