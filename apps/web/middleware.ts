import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = new Set(["/auth/login", "/auth/signup"]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const hasSupabaseSession = request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-"));

  if (!hasSupabaseSession) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"]
};
