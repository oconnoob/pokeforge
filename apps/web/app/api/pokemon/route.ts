import { NextRequest, NextResponse } from "next/server";
import { getRequestUserOrNull } from "@/lib/auth/request-user";
import { listPokemon, type ListPokemonOptions } from "@/lib/pokemon/repository";

const parseOptions = (request: NextRequest): ListPokemonOptions => {
  const params = request.nextUrl.searchParams;
  const page = Number(params.get("page") ?? "1");
  const pageSize = Number(params.get("pageSize") ?? "24");
  const sourceType = params.get("sourceType");
  const search = params.get("search") ?? "";

  return {
    page: Number.isNaN(page) ? 1 : page,
    pageSize: Number.isNaN(pageSize) ? 24 : pageSize,
    sourceType: sourceType === "builtin" || sourceType === "generated" ? sourceType : undefined,
    search
  };
};

export async function GET(request: NextRequest) {
  const user = await getRequestUserOrNull();

  const result = await listPokemon({
    ...parseOptions(request),
    requesterUserId: user?.id
  });

  return NextResponse.json({
    pokemon: result.items,
    pagination: {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / result.pageSize))
    }
  });
}
