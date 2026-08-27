import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "asl_session";
const PUBLIC_PATHS = ["/login", "/api/setup"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Applique le middleware à toutes les routes sauf :
     * - fichiers statiques Next.js (_next)
     * - assets (images, favicon)
     * - routes d'API d'authentification (login gère lui-même)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/auth|api/setup).*)",
  ],
};
