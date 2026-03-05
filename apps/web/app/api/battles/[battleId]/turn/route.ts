import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  actionType: z.enum(["move", "switch"]),
  moveId: z.string().optional()
});

export async function POST(request: NextRequest, context: { params: Promise<{ battleId: string }> }) {
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid turn payload" }, { status: 400 });
  }

  const { battleId } = await context.params;

  return NextResponse.json({
    battleId,
    resolvedAction: parsed.data,
    turnResult: "pending-engine-implementation"
  });
}
