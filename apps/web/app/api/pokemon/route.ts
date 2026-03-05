import { NextResponse } from "next/server";
import { BUILTIN_POKEMON_NAMES } from "@/lib/pokemon/builtin";

export async function GET() {
  return NextResponse.json({
    pokemon: BUILTIN_POKEMON_NAMES.map((name, index) => ({
      id: `builtin-${index + 1}`,
      name,
      sourceType: "builtin"
    }))
  });
}
