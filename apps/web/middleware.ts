import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATHS = ["/battle"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PATHS.some((path) => pathname.startsWith(path));

  if (!isProtected) {
    return NextResponse.next();
  }

  const hasSupabaseSession = request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-"));

  if (!hasSupabaseSession) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/battle/:path*"]
};
